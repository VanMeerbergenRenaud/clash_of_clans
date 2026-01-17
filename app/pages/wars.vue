<script setup lang="ts">
import { 
  Users, 
  Trophy, 
  Calendar,
  Shield,
  Star as StarIcon,
  Swords as SwordsIcon,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  X
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()

// -- STATE --
// View Mode
const viewMode = ref<'participants' | 'results'>('participants')

const loading = ref(false)
const error = ref<string | null>(null)

// Data
const trackedClans = ref<any[]>([])
const selectedClanTag = ref('')
const currentWar = ref<any>(null)
const pastWars = ref<any[]>([])

// War History Detail Modal
const selectedWarHistory = ref<any>(null)
const warParticipants = ref<any[]>([])
const loadingWarDetails = ref(false)
const showWarModal = ref(false)

// Sorting state for modal table
const sortColumn = ref<'map_position' | 'attacks_count' | 'stars' | 'destruction' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// Sorting state for current war participants table
const currentWarSortColumn = ref<'mapPosition' | 'attacks' | 'stars' | 'destruction' | null>(null)
const currentWarSortDirection = ref<'asc' | 'desc'>('asc')

const activeStatTab = ref<'pending' | 'perfect' | 'completed' | 'struggling'>('pending')

// -- COMPUTED --
const selectedClan = computed(() => trackedClans.value.find(c => c.tag === selectedClanTag.value))

const participants = computed(() => {
  if (!currentWar.value?.clan?.members) return []
  return [...currentWar.value.clan.members].sort((a: any, b: any) => a.mapPosition - b.mapPosition)
})

// Sorted participants for table (current war)
const sortedCurrentWarParticipants = computed(() => {
  if (!participants.value.length) return []
  
  const sorted = [...participants.value].map((m: any) => ({
    ...m,
    attacksCount: m.attacks?.length || 0,
    totalStars: m.attacks ? m.attacks.reduce((sum: number, a: any) => sum + a.stars, 0) : 0,
    avgDestruction: m.attacks && m.attacks.length > 0 
      ? m.attacks.reduce((sum: number, a: any) => sum + a.destructionPercentage, 0) / m.attacks.length 
      : 0
  }))
  
  if (!currentWarSortColumn.value) return sorted
  
  sorted.sort((a, b) => {
    let aVal: number, bVal: number
    switch (currentWarSortColumn.value) {
      case 'mapPosition':
        aVal = a.mapPosition
        bVal = b.mapPosition
        break
      case 'attacks':
        aVal = a.attacksCount
        bVal = b.attacksCount
        break
      case 'stars':
        aVal = a.totalStars
        bVal = b.totalStars
        break
      case 'destruction':
        aVal = a.avgDestruction
        bVal = b.avgDestruction
        break
      default:
        return 0
    }
    return currentWarSortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return sorted
})

const isWarActive = computed(() => {
  return currentWar.value && currentWar.value.state !== 'notInWar'
})

const stats = computed(() => {
  if (!currentWar.value?.clan?.members) return { pending: [], completed: [], perfect: [], struggling: [] }
  
  const pending: any[] = []
  const completed: any[] = []
  const perfect: any[] = []
  const struggling: any[] = []
  
  currentWar.value.clan.members.forEach((m: any) => {
    const attacks = m.attacks || []
    const attacksCount = attacks.length
    
    // Pending / Completed logic
    if (attacksCount < 2) {
      pending.push({ ...m })
    } else {
      completed.push({ ...m })
    }
    
    // Perfect logic (Six Pack)
    if (attacksCount === 2 && attacks.every((a: any) => a.stars === 3)) {
      perfect.push({ ...m })
    }

    // Struggling logic (Has at least one attack with <= 1 star)
    if (attacks.some((a: any) => a.stars <= 1)) {
        struggling.push({ ...m })
    }
  })

  // Best Defenses Logic
  let bestDefenses = currentWar.value.clan.members
    .filter((m: any) => m.bestOpponentAttack && m.bestOpponentAttack.stars < 3)
    .sort((a: any, b: any) => {
        if (a.bestOpponentAttack.stars !== b.bestOpponentAttack.stars) {
            return a.bestOpponentAttack.stars - b.bestOpponentAttack.stars
        }
        return a.bestOpponentAttack.destructionPercentage - b.bestOpponentAttack.destructionPercentage
    })

  // Apply limit logic: if > 15 candidates, show only <= 1 star
  if (bestDefenses.length > 15) {
      bestDefenses = bestDefenses.filter((m: any) => m.bestOpponentAttack.stars <= 1)
  }

  // Map attacker name
  bestDefenses = bestDefenses.map((m: any) => {
      const attacker = currentWar.value.opponent.members.find((op: any) => op.tag === m.bestOpponentAttack.attackerTag)
      return {
          ...m,
          bestOpponentAttack: {
              ...m.bestOpponentAttack,
              attackerName: attacker ? attacker.name : 'Inconnu'
          }
      }
  })

  // Top Destruction Logic (removed as requested)

  return {
    pending: pending.sort((a, b) => a.mapPosition - b.mapPosition),
    bestDefenses,
    perfect,
    struggling: struggling.sort((a, b) => a.mapPosition - b.mapPosition)
  }
})

// -- METHODS --
const fetchTrackedClans = async () => {
  loading.value = true
  const { data, error: dbError } = await supabase.from('tracked_clans')
    .select('*')
    .order('ordered', { ascending: true })
    
  if (dbError) {
    console.error('Error fetching tracked clans:', dbError)
    error.value = `Impossible de charger les clans: ${dbError.message || dbError.details || 'Erreur inconnue'}`
    loading.value = false
    return
  }

  if (data) {
    trackedClans.value = data
    const firstClan = data[0] as any
    if (firstClan && !selectedClanTag.value) {
      selectedClanTag.value = firstClan.tag
    }
  }
  
  if (!selectedClanTag.value) {
    loading.value = false
  }
}

const fetchWarData = async () => {
  if (!selectedClanTag.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const encodedTag = encodeURIComponent(selectedClanTag.value)
    
    const [warRes, historyRes] = await Promise.all([
       $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar`).catch(e => {
         if (e.statusCode === 403) error.value = "Journal privé"
         return null
       }),
       supabase.from('war_history').select('*').eq('clan_tag', selectedClanTag.value).order('end_date', { ascending: false }).limit(20)
    ])

    if (warRes && warRes.state !== 'notInWar') {
      currentWar.value = warRes
    } else {
      currentWar.value = null
    }

    if (historyRes.data) {
      pastWars.value = historyRes.data
    } else {
      pastWars.value = []
    }

  } catch (err) {
    console.error(err)
    error.value = "Erreur de chargement"
  } finally {
    loading.value = false
  }
}

// Fetch war details (participants) for a specific past war
const fetchWarDetails = async (war: any) => {
  loadingWarDetails.value = true
  selectedWarHistory.value = war
  showWarModal.value = true
  
  try {
    const { data, error: dbError } = await supabase
      .from('war_participants')
      .select('*')
      .eq('war_id', war.id)
      .order('map_position', { ascending: true })
    
    if (dbError) {
      console.error('Error fetching war participants:', dbError)
      warParticipants.value = []
    } else {
      warParticipants.value = data || []
    }
  } catch (err) {
    console.error(err)
    warParticipants.value = []
  } finally {
    loadingWarDetails.value = false
  }
}

const closeWarModal = () => {
  showWarModal.value = false
  selectedWarHistory.value = null
  warParticipants.value = []
  sortColumn.value = null
  sortDirection.value = 'desc'
}

// Toggle sort for table columns
const toggleSort = (column: 'map_position' | 'attacks_count' | 'stars' | 'destruction') => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    // Default to ascending for map_position, descending for others
    sortDirection.value = column === 'map_position' ? 'asc' : 'desc'
  }
}

// Toggle sort for current war participants table
const toggleCurrentWarSort = (column: 'mapPosition' | 'attacks' | 'stars' | 'destruction') => {
  if (currentWarSortColumn.value === column) {
    currentWarSortDirection.value = currentWarSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    currentWarSortColumn.value = column
    // Default to ascending for mapPosition, descending for others
    currentWarSortDirection.value = column === 'mapPosition' ? 'asc' : 'desc'
  }
}

// Computed for war history stats
const historyStats = computed(() => {
  if (!warParticipants.value.length) return { sixStars: [], missingAttacks: [] }
  
  const sixStars = warParticipants.value
    .filter(p => p.stars === 6)
    .sort((a, b) => a.map_position - b.map_position)
  
  const missingAttacks = warParticipants.value
    .filter(p => p.attacks_count < 2)
    .sort((a, b) => a.attacks_count - b.attacks_count || a.map_position - b.map_position)
  
  return { sixStars, missingAttacks }
})

// Sorted participants for table
const sortedParticipants = computed(() => {
  if (!warParticipants.value.length) return []
  
  const sorted = [...warParticipants.value]
  
  if (sortColumn.value) {
    sorted.sort((a, b) => {
      const aVal = a[sortColumn.value!]
      const bVal = b[sortColumn.value!]
      if (sortDirection.value === 'asc') {
        return aVal - bVal
      } else {
        return bVal - aVal
      }
    })
  } else {
    // Default sort by map position
    sorted.sort((a, b) => a.map_position - b.map_position)
  }
  
  return sorted
})

watch(selectedClanTag, (newVal) => {
  if (newVal) fetchWarData()
})

onMounted(() => {
  fetchTrackedClans()
})
</script>

<template>
  <div class="space-y-8 pb-32">
    
    <!-- HEADER: Title, Clan Selector & View Switcher -->
    <div class="flex flex-col gap-5">
       <!-- Top Row: Title & Controls -->
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
             <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900">
               <SwordsIcon class="w-5 h-5" />
             </div>
             Guerres
          </h1>

          <div class="flex items-center gap-3">
            <!-- Clan Selector Dropdown -->
            <div class="relative">
              <select 
                v-model="selectedClanTag"
                class="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-900 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all min-w-[160px]"
              >
                <option v-for="clan in trackedClans" :key="clan.tag" :value="clan.tag">
                  {{ clan.name }}
                </option>
              </select>
              <!-- Custom dropdown arrow -->
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown class="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <!-- View Switcher -->
            <div class="flex p-1 bg-slate-100 rounded-lg">
               <button 
                 @click="viewMode = 'participants'"
                 class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
                 :class="viewMode === 'participants' 
                    ? 'bg-white text-slate-900' 
                    : 'text-slate-500 hover:text-slate-700'"
               >
                 Guerre en cours
               </button>
               <button 
                 @click="viewMode = 'results'"
                 class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
                 :class="viewMode === 'results' 
                    ? 'bg-white text-slate-900' 
                    : 'text-slate-500 hover:text-slate-700'"
               >
                 Historique
               </button>
            </div>
          </div>
       </div>
       
       <!-- Loading skeleton for clan selector -->
       <div v-if="loading && trackedClans.length === 0" class="animate-pulse flex gap-2">
          <div class="h-10 w-40 bg-slate-100 rounded-lg"></div>
       </div>
    </div>


    <!-- MAIN CONTENT -->
    
    <!-- LOADING -->
    <div v-if="loading && !currentWar && !pastWars.length && trackedClans.length > 0" class="py-32 flex flex-col items-center justify-center space-y-4">
       <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
    </div>

    <div v-else class="min-h-[400px]">

      <!-- VIEW: PARTICIPANTS -->
      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="hidden"
      >
      <div v-if="viewMode === 'participants'" key="participants" class="space-y-10">
        
        <!-- Status Card -->
        <div v-if="!isWarActive" class="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
           <Shield class="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <h3 class="text-lg font-bold text-slate-900">Aucune guerre active</h3>
           <p class="text-slate-500 text-sm mt-1">Le clan est au repos ou le journal est privé.</p>
           <span v-if="error" class="text-red-500 text-xs mt-2 block">{{ error }}</span>
        </div>

         <div v-else class="space-y-6">
            
            <!-- War Header (Harmonious & Colored - Updated) -->
            <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                <!-- Top Status Bar (Subtle Gradient Background) -->
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/30 to-white">
                    <!-- Status & Size -->
                    <div class="flex items-center gap-3">
                         <div class="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border"
                              :class="currentWar.state === 'inWar' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'">
                              <span class="relative flex h-2 w-2">
                                <span v-if="currentWar.state === 'inWar'" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2" :class="currentWar.state === 'inWar' ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                              </span>
                              {{ currentWar.state === 'inWar' ? 'En cours' : 'Préparation' }}
                         </div>
                         <div class="hidden sm:flex text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                            {{ currentWar.teamSize }} vs {{ currentWar.teamSize }}
                         </div>
                    </div>
                    <!-- Timer -->
                    <div class="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                         <Calendar class="w-3.5 h-3.5 opacity-75" />
                         <span>Fin à {{ new Date(currentWar.endTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
                    </div>
                </div>

                <!-- Matchup Content -->
                <div class="p-6 md:p-10">
                    <div class="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                        
                        <!-- Home Clan (Indigo Theme) -->
                        <div class="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-5 w-full">
                            <div class="flex items-center gap-5 w-full justify-center md:justify-start">
                                <!-- Logo with centered bottom level -->
                                <div class="relative shrink-0">
                                    <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center overflow-hidden">
                                        <img 
                                          v-if="currentWar.clan.badgeUrls?.medium" 
                                          :src="currentWar.clan.badgeUrls.medium" 
                                          :alt="currentWar.clan.name" 
                                          class="w-full h-full object-contain p-2" 
                                        />
                                        <span v-else class="text-3xl font-black text-indigo-600">
                                            {{ currentWar.clan.name?.charAt(0).toUpperCase() }}
                                        </span>
                                    </div>
                                    <div v-if="currentWar.clan.clanLevel" class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border-2 border-white whitespace-nowrap z-10">
                                         Niveau {{ currentWar.clan.clanLevel }}
                                    </div>
                                </div>
                                
                                <div class="min-w-0 flex-1 hidden md:block">
                                    <h3 class="text-2xl font-bold text-slate-900 truncate">{{ currentWar.clan.name }}</h3>
                                    <div class="flex items-center gap-2 mt-1">
                                       <span class="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                                       <span class="text-xs font-semibold text-indigo-900/60 uppercase tracking-wide">Notre Clan</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Mobile Name -->
                            <h3 class="text-xl font-bold text-slate-900 truncate md:hidden mt-2">{{ currentWar.clan.name }}</h3>
                            
                            <!-- Detailed Stats -->
                            <div class="w-full space-y-2 mt-1">
                                <div class="flex justify-between items-end">
                                    <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Destruction</span>
                                    <span class="text-xl font-black text-indigo-600">{{ currentWar.clan.destructionPercentage.toFixed(1) }}%</span>
                                </div>
                                <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
                                    <div class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full" :style="{ width: `${currentWar.clan.destructionPercentage}%` }"></div>
                                </div>
                            </div>
                        </div>

                        <!-- VS / Score Center -->
                        <div class="shrink-0 flex flex-col items-center gap-4 px-4 py-2">
                            <div class="flex items-center gap-8 md:gap-10">
                                <div class="text-center">
                                   <span class="block text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">{{ currentWar.clan.stars }}</span>
                                   <span class="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1 block">Étoiles</span>
                                </div>
                                
                                <div class="h-16 w-px bg-slate-200 rotate-12 mx-2"></div>
                                
                                <div class="text-center">
                                   <span class="block text-5xl md:text-6xl font-black text-slate-400 tracking-tighter leading-none">{{ currentWar.opponent.stars }}</span>
                                   <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Étoiles</span>
                                </div>
                            </div>
                        </div>

                        <!-- Opponent Clan (Warm Gray Theme) -->
                        <div class="flex-1 flex flex-col items-center md:items-end text-center md:text-right gap-5 w-full">
                            <div class="flex items-center flex-row-reverse gap-5 w-full justify-center md:justify-start">
                                <!-- Logo with centered bottom level -->
                                <div class="relative shrink-0">
                                    <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                                        <img 
                                          v-if="currentWar.opponent.badgeUrls?.medium" 
                                          :src="currentWar.opponent.badgeUrls.medium" 
                                          :alt="currentWar.opponent.name" 
                                          class="w-full h-full object-contain p-2" 
                                        />
                                        <span v-else class="text-3xl font-black text-slate-500">
                                            {{ currentWar.opponent.name?.charAt(0).toUpperCase() }}
                                        </span>
                                    </div>
                                    <div v-if="currentWar.opponent.clanLevel" class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full border-2 border-white whitespace-nowrap z-10">
                                         Niveau {{ currentWar.opponent.clanLevel }}
                                    </div>
                                </div>
                                
                                <div class="min-w-0 flex-1 hidden md:block">
                                    <h3 class="text-2xl font-bold text-slate-700 truncate">{{ currentWar.opponent.name }}</h3>
                                    <div class="flex items-center justify-end gap-2 mt-1">
                                       <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Adversaire</span>
                                       <span class="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Mobile Name -->
                            <h3 class="text-xl font-bold text-slate-700 truncate md:hidden mt-2">{{ currentWar.opponent.name }}</h3>

                            <!-- Detailed Stats -->
                            <div class="w-full space-y-2 mt-1">
                                <div class="flex justify-between items-end flex-row-reverse">
                                    <span class="text-xs font-medium text-slate-400 uppercase tracking-wider">Destruction</span>
                                    <span class="text-xl font-black text-slate-600">{{ currentWar.opponent.destructionPercentage.toFixed(1) }}%</span>
                                </div>
                                <div class="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-[2px] flex justify-end">
                                    <div class="h-full bg-gradient-to-l from-slate-400 to-slate-500 rounded-full" :style="{ width: `${currentWar.opponent.destructionPercentage}%` }"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                
                <!-- Footer Result -->
                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                     <div v-if="currentWar.clan.stars > currentWar.opponent.stars" class="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full border border-emerald-200/50">
                        <Trophy class="w-4 h-4" />
                        <span>Victoire en cours (+{{ currentWar.clan.stars - currentWar.opponent.stars }})</span>
                     </div>
                     <div v-else-if="currentWar.clan.stars < currentWar.opponent.stars" class="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100/50 px-4 py-1.5 rounded-full border border-amber-200/50">
                        <AlertCircle class="w-4 h-4" />
                        <span>Retard de {{ currentWar.opponent.stars - currentWar.clan.stars }} étoiles</span>
                     </div>
                     <div v-else class="inline-flex items-center gap-2 text-xs font-bold text-slate-500 bg-white px-4 py-1.5 rounded-full border border-slate-200">
                        <SwordsIcon class="w-4 h-4" />
                        <span>Égalité parfaite</span>
                     </div>
                </div>
            </div>

            <!-- Stats Cards (2x2 Grid like leagues modal) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               
               <!-- 6 Stars Card -->
               <div class="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                  <div class="px-4 py-3 flex items-center justify-between border-b border-amber-200/50">
                     <div class="flex items-center gap-2 text-amber-600">
                        <StarIcon class="w-4 h-4" />
                        <span class="font-semibold text-sm">6 Étoiles (Perfects)</span>
                     </div>
                     <span class="text-sm font-bold text-amber-600">{{ stats.perfect.length }}</span>
                  </div>
                  <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                     <div v-if="stats.perfect.length > 0">
                        <div v-for="m in stats.perfect" :key="m.tag" class="flex items-center justify-between py-2 border-b border-amber-200/20 last:border-0">
                           <div class="flex items-center gap-3">
                              <span class="text-xs font-medium text-slate-400 w-6">{{ m.mapPosition }}</span>
                              <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                           </div>
                           <span class="text-xs font-semibold text-amber-500 bg-amber-100 px-2 py-0.5 rounded">6★</span>
                        </div>
                     </div>
                     <div v-else class="py-6 text-center text-slate-400 text-xs">
                        Pas encore de 6 étoiles
                     </div>
                  </div>
               </div>

               <!-- Missing Attacks Card -->
               <div class="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
                  <div class="px-4 py-3 flex items-center justify-between border-b border-red-200/50">
                     <div class="flex items-center gap-2 text-red-500">
                        <Shield class="w-4 h-4" />
                        <span class="font-semibold text-sm">Attaques Manquantes</span>
                     </div>
                     <span class="text-sm font-bold text-red-500">{{ stats.pending.length }}</span>
                  </div>
                  <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                     <div v-if="stats.pending.length > 0">
                        <div v-for="m in stats.pending" :key="m.tag" class="flex items-center justify-between py-2 border-b border-red-200/20 last:border-0">
                           <div class="flex items-center gap-3">
                              <span class="text-xs font-medium text-slate-400 w-6">{{ m.mapPosition }}</span>
                              <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                           </div>
                           <span class="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded">-{{ 2 - (m.attacks ? m.attacks.length : 0) }}</span>
                        </div>
                     </div>
                     <div v-else class="py-6 text-center text-green-600 text-xs font-medium">
                        ✓ Tout le monde a attaqué
                     </div>
                  </div>
               </div>

                <!-- Best Defenses Card -->
                <div class="rounded-xl border border-indigo-200 bg-indigo-50/50 overflow-hidden">
                   <div class="px-4 py-3 flex items-center justify-between border-b border-indigo-200/50">
                      <div class="flex items-center gap-2 text-indigo-600">
                         <Shield class="w-4 h-4" />
                         <span class="font-semibold text-sm">Meilleures défenses</span>
                      </div>
                      <span class="text-xs font-medium text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full" v-if="stats.bestDefenses.length > 0">Top {{ stats.bestDefenses.length }}</span>
                   </div>
                   <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                      <div v-if="stats.bestDefenses.length > 0">
                         <div v-for="m in stats.bestDefenses" :key="m.tag" class="flex items-center justify-between py-2 border-b border-indigo-200/20 last:border-0">
                            <div class="flex flex-col">
                               <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                               <span class="text-[10px] text-slate-400" v-if="m.bestOpponentAttack">
                                 vs {{ m.bestOpponentAttack.attackerName }}
                               </span>
                            </div>
                            <div class="flex items-center gap-2">
                               <span class="text-xs font-semibold px-2 py-0.5 rounded"
                                     :class="m.bestOpponentAttack.stars === 0 ? 'text-indigo-600 bg-indigo-100' : (m.bestOpponentAttack.stars === 1 ? 'text-indigo-500 bg-indigo-50' : 'text-slate-500 bg-slate-100')">
                                 {{ m.bestOpponentAttack.stars }}★
                               </span>
                               <span class="text-xs font-medium text-slate-500">{{ m.bestOpponentAttack.destructionPercentage }}%</span>
                            </div>
                         </div>
                      </div>
                      <div v-else class="py-6 text-center text-slate-400 text-xs">
                         Aucune défense notable
                      </div>
                   </div>
                </div>

               <!-- Struggling Card -->
               <div class="rounded-xl border border-orange-200 bg-orange-50/50 overflow-hidden">
                  <div class="px-4 py-3 flex items-center justify-between border-b border-orange-200/50">
                     <div class="flex items-center gap-2 text-orange-500">
                        <AlertCircle class="w-4 h-4" />
                        <span class="font-semibold text-sm">En Difficulté (≤1 étoile)</span>
                     </div>
                     <span class="text-sm font-bold text-orange-500">{{ stats.struggling.length }}</span>
                  </div>
                  <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                     <div v-if="stats.struggling.length > 0">
                        <div v-for="m in stats.struggling" :key="m.tag" class="flex items-center justify-between py-2 border-b border-orange-200/20 last:border-0">
                           <div class="flex items-center gap-3">
                              <span class="text-xs font-medium text-slate-400 w-6">{{ m.mapPosition }}</span>
                              <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                           </div>
                           <div class="flex gap-1">
                              <span v-for="atk in m.attacks.filter((a: any) => a.stars <= 1)" :key="atk.order" 
                                    class="text-xs font-semibold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">
                                {{ atk.stars }}★
                              </span>
                           </div>
                        </div>
                     </div>
                     <div v-else class="py-6 text-center text-slate-400 text-xs">
                        Aucun échec pour le moment
                     </div>
                  </div>
               </div>
            </div>

            <!-- Participants Table (Clean like modal) -->
            <div>
               <div class="px-1 flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2 text-slate-500">
                     <Users class="w-4 h-4" />
                     <span class="font-semibold text-sm">Tous les participants</span>
                  </div>
                  <span class="text-xs font-medium text-slate-400">{{ participants.length }} joueurs</span>
               </div>
               
               <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div class="overflow-x-auto">
                     <table class="w-full text-sm">
                        <thead>
                           <tr class="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-100">
                              <th class="px-4 py-3 text-left w-12">
                                 <button @click="toggleCurrentWarSort('mapPosition')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                                    #
                                    <template v-if="currentWarSortColumn === 'mapPosition'">
                                       <ChevronUp v-if="currentWarSortDirection === 'asc'" class="w-3 h-3" />
                                       <ChevronDown v-else class="w-3 h-3" />
                                    </template>
                                 </button>
                              </th>
                              <th class="px-4 py-3 text-left">Joueur</th>
                              <th class="px-4 py-3 text-center">HDV</th>
                              <th class="px-4 py-3 text-center">
                                 <button @click="toggleCurrentWarSort('attacks')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors mx-auto">
                                    Attaques
                                    <template v-if="currentWarSortColumn === 'attacks'">
                                       <ChevronUp v-if="currentWarSortDirection === 'asc'" class="w-3 h-3" />
                                       <ChevronDown v-else class="w-3 h-3" />
                                    </template>
                                 </button>
                              </th>
                              <th class="px-4 py-3 text-center">
                                 <button @click="toggleCurrentWarSort('stars')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors mx-auto">
                                    Étoiles
                                    <template v-if="currentWarSortColumn === 'stars'">
                                       <ChevronUp v-if="currentWarSortDirection === 'asc'" class="w-3 h-3" />
                                       <ChevronDown v-else class="w-3 h-3" />
                                    </template>
                                 </button>
                              </th>
                              <th class="px-4 py-3 text-right">
                                 <button @click="toggleCurrentWarSort('destruction')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors ml-auto">
                                    Destruction
                                    <template v-if="currentWarSortColumn === 'destruction'">
                                       <ChevronUp v-if="currentWarSortDirection === 'asc'" class="w-3 h-3" />
                                       <ChevronDown v-else class="w-3 h-3" />
                                    </template>
                                 </button>
                              </th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                           <tr v-for="member in sortedCurrentWarParticipants" :key="member.tag" class="hover:bg-slate-50/50 transition-colors">
                              <td class="px-4 py-3 text-slate-400 text-xs font-medium">{{ member.mapPosition }}</td>
                              <td class="px-4 py-3">
                                 <span class="font-medium text-slate-900">{{ member.name }}</span>
                              </td>
                              <td class="px-4 py-3 text-center">
                                 <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{{ member.townhallLevel }}</span>
                              </td>
                              <td class="px-4 py-3 text-center">
                                 <div class="flex justify-center gap-1">
                                    <div v-for="i in 2" :key="i" class="w-2 h-2 rounded-full"
                                       :class="{
                                         'bg-green-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 3,
                                         'bg-amber-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 2,
                                         'bg-red-400': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars <= 1,
                                         'bg-slate-200': !member.attacks || !member.attacks[i-1]
                                       }">
                                    </div>
                                 </div>
                              </td>
                              <td class="px-4 py-3 text-center">
                                 <span class="font-semibold text-slate-700">
                                    {{ member.totalStars }}
                                    <span class="text-amber-400">★</span>
                                 </span>
                              </td>
                              <td class="px-4 py-3 pr-12 text-right font-medium text-slate-600">
                                 {{ member.avgDestruction.toFixed(0) }}%
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>
      </div>
      </Transition>

      <!-- VIEW: RESULTS -->
       <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="hidden"
      >
      <div v-if="viewMode === 'results'" key="results" class="space-y-6">
        
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy class="w-5 h-5 text-amber-500" />
            Historique des guerres
          </h2>
          <span class="text-xs text-slate-400 font-medium">{{ pastWars.length }} guerres enregistrées</span>
        </div>
        
        <div v-if="pastWars.length === 0" class="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
           <Trophy class="w-10 h-10 text-slate-300 mx-auto mb-3" />
           <p class="text-slate-500 text-sm">Aucun historique disponible.</p>
        </div>

        <div v-else class="space-y-4">
           <button 
             v-for="war in pastWars" 
             :key="war.id"
             @click="fetchWarDetails(war)"
             class="group w-full text-left bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-300 overflow-hidden cursor-pointer"
           >
              <!-- Top Bar with Result Badge and Date -->
              <div class="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <div class="flex items-center gap-3">

                       <span class="text-xs font-bold uppercase tracking-wider" 
                             :class="war.result === 'win' ? 'text-green-600' : war.result === 'lose' ? 'text-red-600' : 'text-slate-500'">
                         {{ war.result === 'win' ? 'Victoire' : war.result === 'lose' ? 'Défaite' : 'Nul' }}
                       </span>

                 </div>
                 <div class="flex items-center gap-4 text-xs text-slate-400">
                    <div class="flex items-center gap-1.5">
                       <Calendar class="w-3.5 h-3.5" />
                       <span class="font-medium">{{ new Date(war.end_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 bg-slate-200 px-2 py-0.5 rounded-full">
                       <Users class="w-3 h-3" />
                       <span class="font-bold">{{ war.team_size }}v{{ war.team_size }}</span>
                    </div>
                 </div>
              </div>
              
              <!-- Main Content: Both Clans -->
              <div class="p-5">
                 <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center">
                    
                    <!-- Our Clan (Left) -->
                    <div class="flex items-center gap-4">
                       <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          <img v-if="war.clan_badge_url || selectedClan?.badge_url" :src="war.clan_badge_url || selectedClan?.badge_url" :alt="war.clan_name" class="w-full h-full object-contain p-2" />
                          <span v-else class="text-2xl font-black text-slate-600">{{ war.clan_name?.charAt(0).toUpperCase() }}</span>
                       </div>
                       <div class="min-w-0 flex-1">
                          <div class="font-bold text-slate-900 text-base truncate">{{ war.clan_name }}</div>
                          <div class="text-xs font-mono text-slate-400 truncate">{{ war.clan_tag }}</div>
                          <div class="flex items-center gap-2 mt-1.5">
                             <span class="text-xl font-black text-slate-900">{{ war.clan_stars }}<span class="text-amber-500 text-sm">★</span></span>
                             <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{{ war.clan_destruction.toFixed(1) }}%</span>
                          </div>
                       </div>
                    </div>
                    
                    <!-- VS Separator -->
                    <div class="hidden md:flex flex-col items-center justify-center px-4">
                       <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <SwordsIcon class="w-5 h-5 text-slate-400" />
                       </div>
                    </div>
                    
                    <!-- Mobile VS -->
                    <div class="md:hidden flex items-center justify-center">
                       <div class="flex items-center gap-3">
                          <div class="h-px flex-1 bg-slate-200"></div>
                          <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                             <SwordsIcon class="w-4 h-4 text-slate-400" />
                          </div>
                          <div class="h-px flex-1 bg-slate-200"></div>
                       </div>
                    </div>
                    
                    <!-- Opponent Clan (Right) -->
                    <div class="flex items-center gap-4 md:flex-row-reverse md:text-right">
                       <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shrink-0 opacity-75">
                          <img v-if="war.opponent_badge_url" :src="war.opponent_badge_url" :alt="war.opponent_name" class="w-full h-full object-contain p-2" />
                          <span v-else class="text-2xl font-black text-slate-500">{{ war.opponent_name?.charAt(0).toUpperCase() }}</span>
                       </div>
                       <div class="min-w-0 flex-1">
                          <div class="font-bold text-slate-600 text-base truncate">{{ war.opponent_name }}</div>
                          <div class="text-xs font-mono text-slate-400 truncate">{{ war.opponent_tag }}</div>
                          <div class="flex items-center gap-2 mt-1.5 md:justify-end">
                             <span class="text-xl font-black text-slate-500">{{ war.opponent_stars }}<span class="text-amber-500/50 text-sm">★</span></span>
                             <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{{ war.opponent_destruction.toFixed(1) }}%</span>
                          </div>
                       </div>
                    </div>
                    
                 </div>
              </div>

              <!-- Bottom Action Bar -->
              <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <span class="text-xs font-medium text-slate-400">Voir les détails de la guerre</span>
                 <ChevronRight class="w-5 h-5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
              </div>
           </button>
        </div>
      </div>
      </Transition>

    </div>

    <!-- WAR HISTORY DETAIL MODAL -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showWarModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/40" @click="closeWarModal"></div>
          
          <!-- Modal Content -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div v-if="showWarModal" class="relative bg-white rounded-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              
              <!-- Header -->
              <div class="bg-white border-b border-slate-100">
                <!-- Top bar with result, date and close button -->
                <div class="px-6 py-3 bg-slate-50 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold uppercase tracking-wider" 
                          :class="selectedWarHistory?.result === 'win' ? 'text-green-600' : selectedWarHistory?.result === 'lose' ? 'text-red-600' : 'text-slate-500'">
                      {{ selectedWarHistory?.result === 'win' ? 'Victoire' : selectedWarHistory?.result === 'lose' ? 'Défaite' : 'Nul' }}
                    </span>
                    <span class="text-slate-300">•</span>
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar class="w-3.5 h-3.5" />
                      <span class="font-medium">{{ selectedWarHistory ? new Date(selectedWarHistory.end_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-500">
                      <Users class="w-3 h-3" />
                      <span class="font-bold">{{ selectedWarHistory?.team_size }}v{{ selectedWarHistory?.team_size }}</span>
                    </div>
                  </div>
                  <button @click="closeWarModal" class="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                    <X class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Both Clans Display -->
                <div class="px-6 py-5">
                  <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center">
                    
                    <!-- Our Clan (Left) -->
                    <div class="flex items-center gap-4">
                      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        <img v-if="selectedWarHistory?.clan_badge_url || selectedClan?.badge_url" :src="selectedWarHistory?.clan_badge_url || selectedClan?.badge_url" :alt="selectedWarHistory.clan_name" class="w-full h-full object-contain p-2" />
                        <span v-else class="text-2xl font-black text-slate-600">{{ selectedWarHistory?.clan_name?.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-slate-900 text-base truncate">{{ selectedWarHistory?.clan_name }}</div>
                        <div class="text-xs font-mono text-slate-400 truncate">{{ selectedWarHistory?.clan_tag }}</div>
                        <div class="flex items-center gap-2 mt-1.5">
                          <span class="text-xl font-black text-slate-900">{{ selectedWarHistory?.clan_stars }}<span class="text-amber-500 text-sm">★</span></span>
                          <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{{ selectedWarHistory?.clan_destruction.toFixed(1) }}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- VS Separator -->
                    <div class="hidden md:flex flex-col items-center justify-center px-4">
                      <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <SwordsIcon class="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    
                    <!-- Mobile VS -->
                    <div class="md:hidden flex items-center justify-center">
                      <div class="flex items-center gap-3 w-full">
                        <div class="h-px flex-1 bg-slate-200"></div>
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <SwordsIcon class="w-4 h-4 text-slate-400" />
                        </div>
                        <div class="h-px flex-1 bg-slate-200"></div>
                      </div>
                    </div>
                    
                    <!-- Opponent Clan (Right) -->
                    <div class="flex items-center gap-4 md:flex-row-reverse md:text-right">
                      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center overflow-hidden shrink-0 opacity-75">
                        <img v-if="selectedWarHistory?.opponent_badge_url" :src="selectedWarHistory.opponent_badge_url" :alt="selectedWarHistory.opponent_name" class="w-full h-full object-contain p-2" />
                        <span v-else class="text-2xl font-black text-slate-500">{{ selectedWarHistory?.opponent_name?.charAt(0).toUpperCase() }}</span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-slate-600 text-base truncate">{{ selectedWarHistory?.opponent_name }}</div>
                        <div class="text-xs font-mono text-slate-400 truncate">{{ selectedWarHistory?.opponent_tag }}</div>
                        <div class="flex items-center gap-2 mt-1.5 md:justify-end">
                          <span class="text-xl font-black text-slate-500">{{ selectedWarHistory?.opponent_stars }}<span class="text-amber-500/50 text-sm">★</span></span>
                          <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{{ selectedWarHistory?.opponent_destruction.toFixed(1) }}%</span>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
              
              <!-- Content -->
              <div class="p-6 space-y-8">
                
                <!-- Loading State -->
                <div v-if="loadingWarDetails" class="py-16 flex flex-col items-center justify-center space-y-3">
                  <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900"></div>
                  <span class="text-slate-400 text-sm">Chargement...</span>
                </div>
                
                <!-- Stats Overview -->
                <div v-else-if="warParticipants.length > 0" class="space-y-8">
                  
                  <!-- 6 Stars & Missing Attacks -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- Six Stars -->
                    <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5 border border-amber-200/50">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-bold text-amber-700 flex items-center gap-2">
                          <StarIcon class="w-4 h-4" />
                          6 Étoiles
                        </h3>
                        <span class="text-sm font-bold px-2.5 py-1 bg-amber-200/50 rounded-full text-amber-700">{{ historyStats.sixStars.length }}</span>
                      </div>
                      <div v-if="historyStats.sixStars.length > 0" class="space-y-2">
                        <div v-for="player in historyStats.sixStars" :key="player.player_tag" 
                             class="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100/50">
                          <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded flex items-center justify-center">{{ player.map_position }}</span>
                            <span class="text-sm font-semibold text-slate-900">{{ player.player_name }}</span>
                          </div>
                          <span class="text-sm font-bold text-amber-500">6★</span>
                        </div>
                      </div>
                      <div v-else class="text-sm text-amber-600/70 text-center py-4">Aucun joueur avec 6 étoiles</div>
                    </div>

                    <!-- Missing Attacks -->
                    <div class="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-5 border border-red-200/50">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-bold text-red-700 flex items-center gap-2">
                          <Shield class="w-4 h-4" />
                          Attaques Manquantes
                        </h3>
                        <span class="text-sm font-bold px-2.5 py-1 bg-red-200/50 rounded-full text-red-700">{{ historyStats.missingAttacks.length }}</span>
                      </div>
                      <div v-if="historyStats.missingAttacks.length > 0" class="space-y-2">
                        <div v-for="player in historyStats.missingAttacks" :key="player.player_tag" 
                             class="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-slate-100/50">
                          <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded flex items-center justify-center">{{ player.map_position }}</span>
                            <span class="text-sm font-semibold text-slate-900">{{ player.player_name }}</span>
                          </div>
                          <span class="text-xs font-bold px-2 py-1 rounded" :class="player.attacks_count === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'">
                            -{{ 2 - player.attacks_count }} attaque{{ 2 - player.attacks_count > 1 ? 's' : '' }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="text-sm text-green-600 text-center py-4 flex items-center justify-center gap-2">
                        <span>✓</span> Tout le monde a attaqué
                      </div>
                    </div>
                    
                  </div>
                  
                  <!-- All Participants Table -->
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users class="w-4 h-4 text-slate-500" />
                        Tous les participants
                      </h3>
                      <span class="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{{ warParticipants.length }} joueurs</span>
                    </div>
                    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div class="overflow-x-auto">
                        <table class="w-full">
                          <thead>
                            <tr class="text-xs font-semibold text-slate-500 bg-slate-50">
                              <th class="text-left py-3 pl-4 w-16">
                                <button @click="toggleSort('map_position')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                                  #
                                  <template v-if="sortColumn === 'map_position'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                              <th class="text-left py-3">Joueur</th>
                              <th class="text-center py-3 w-16">HDV</th>
                              <th class="text-center py-3 w-28">
                                <button @click="toggleSort('attacks_count')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                                  Attaques
                                  <template v-if="sortColumn === 'attacks_count'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                              <th class="text-center py-3 w-24">
                                <button @click="toggleSort('stars')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                                  Étoiles
                                  <template v-if="sortColumn === 'stars'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                              <th class="text-right py-3 pr-4 w-28">
                                <button @click="toggleSort('destruction')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors ml-auto">
                                  Destruction
                                  <template v-if="sortColumn === 'destruction'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            <tr v-for="player in sortedParticipants" :key="player.player_tag" 
                                class="hover:bg-slate-50 transition-colors">
                              <td class="py-3 pl-4">
                                <span class="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded inline-flex items-center justify-center">{{ player.map_position }}</span>
                              </td>
                              <td class="py-3">
                                <span class="text-sm font-semibold text-slate-900">{{ player.player_name }}</span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">HDV {{ player.town_hall_level }}</span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-xs font-bold px-2 py-1 rounded-full" 
                                      :class="player.attacks_count === 2 
                                        ? 'bg-green-100 text-green-600' 
                                        : player.attacks_count === 1 
                                          ? 'bg-amber-100 text-amber-600'
                                          : 'bg-red-100 text-red-600'">
                                  {{ player.attacks_count }}/2
                                </span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-sm font-bold" :class="player.stars === 6 ? 'text-amber-500' : 'text-slate-600'">
                                  {{ player.stars }}<span class="text-amber-400">★</span>
                                </span>
                              </td>
                              <td class="py-3 pr-4 text-right">
                                <span class="text-sm font-mono font-medium text-slate-600">{{ player.destruction.toFixed(1) }}%</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                </div>
                
                <!-- Empty State -->
                <div v-else class="py-16 flex flex-col items-center justify-center space-y-3">
                  <AlertCircle class="w-10 h-10 text-slate-300" />
                  <div class="text-center">
                    <p class="text-slate-500 text-sm">Aucune donnée de participants</p>
                  </div>
                </div>
                
              </div>
              
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
    
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
