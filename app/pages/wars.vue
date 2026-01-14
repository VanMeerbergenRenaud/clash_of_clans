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

const activeStatTab = ref<'pending' | 'perfect' | 'completed' | 'struggling'>('pending')

// -- COMPUTED --
const selectedClan = computed(() => trackedClans.value.find(c => c.tag === selectedClanTag.value))

const participants = computed(() => {
  if (!currentWar.value?.clan?.members) return []
  // Sort by map position
  return [...currentWar.value.clan.members].sort((a: any, b: any) => a.mapPosition - b.mapPosition)
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

  // Top Destruction Logic (removed as requested)

  return {
    pending: pending.sort((a, b) => a.mapPosition - b.mapPosition),
    completed,
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
    if (data.length > 0 && !selectedClanTag.value) {
      selectedClanTag.value = data[0].tag
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
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
             <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
               <SwordsIcon class="w-5 h-5" />
             </div>
             Guerres
          </h1>

          <div class="flex items-center gap-3">
            <!-- Clan Selector Dropdown -->
            <div class="relative">
              <select 
                v-model="selectedClanTag"
                class="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-900 dark:text-white cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all min-w-[160px]"
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
            <div class="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
               <button 
                 @click="viewMode = 'participants'"
                 class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
                 :class="viewMode === 'participants' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
               >
                 Guerre en cours
               </button>
               <button 
                 @click="viewMode = 'results'"
                 class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap"
                 :class="viewMode === 'results' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
               >
                 Historique
               </button>
            </div>
          </div>
       </div>
       
       <!-- Loading skeleton for clan selector -->
       <div v-if="loading && trackedClans.length === 0" class="animate-pulse flex gap-2">
          <div class="h-10 w-40 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
       </div>
    </div>


    <!-- MAIN CONTENT -->
    
    <!-- LOADING -->
    <div v-if="loading && !currentWar && !pastWars.length && trackedClans.length > 0" class="py-32 flex flex-col items-center justify-center space-y-4">
       <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white"></div>
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
        <div v-if="!isWarActive" class="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
           <Shield class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
           <h3 class="text-lg font-bold text-slate-900 dark:text-white">Aucune guerre active</h3>
           <p class="text-slate-500 text-sm mt-1">Le clan est au repos ou le journal est privé.</p>
           <span v-if="error" class="text-red-500 text-xs mt-2 block">{{ error }}</span>
        </div>

        <div v-else>
           <!-- War Summary Banner: Dark Minimalist -->
           <div class="bg-slate-900 dark:bg-black rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden">
              <!-- Subtle decorative circle -->
              <div class="absolute -top-24 -right-24 w-64 h-64 bg-slate-800 rounded-full opacity-50 blur-3xl"></div>
              
              <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <!-- Our Clan -->
                <div class="text-center md:text-left space-y-1">
                  <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Nous</div>
                  <div class="text-2xl lg:text-3xl font-bold truncate">{{ currentWar.clan.name }}</div>
                  <div class="flex items-center gap-3 mt-2 justify-center md:justify-start">
                    <span class="text-4xl lg:text-5xl font-black">{{ currentWar.clan.stars }}<span class="text-amber-400 text-2xl">★</span></span>
                    <span class="text-slate-400 font-mono text-lg">{{ currentWar.clan.destructionPercentage.toFixed(1) }}%</span>
                  </div>
                </div>

                <!-- Info Center -->
                <div class="flex flex-col items-center justify-center space-y-3">
                   <div class="px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 bg-white/5 backdrop-blur-sm">
                     {{ currentWar.state === 'inWar' ? 'EN COURS' : 'PRÉPARATION' }}
                   </div>
                   <div class="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                     <Calendar class="w-3.5 h-3.5" />
                     {{ new Date(currentWar.endTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                   </div>
                </div>

                <!-- Opponent -->
                <div class="text-center md:text-right space-y-1">
                  <div class="text-slate-400 text-xs font-bold uppercase tracking-widest">Adversaire</div>
                  <div class="text-2xl lg:text-3xl font-bold truncate">{{ currentWar.opponent.name }}</div>
                   <div class="flex items-center gap-3 mt-2 justify-center md:justify-end">
                    <span class="text-slate-400 font-mono text-lg">{{ currentWar.opponent.destructionPercentage.toFixed(1) }}%</span>
                    <span class="text-4xl lg:text-5xl font-black">{{ currentWar.opponent.stars }}<span class="text-amber-400 text-2xl">★</span></span>
                  </div>
                </div>
              </div>
           </div>

           <!-- STATS TABS (Minimal) -->
           <div class="mt-12 space-y-6">
             <!-- Tabs Headers -->
             <div class="flex overflow-x-auto pb-2 gap-4 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
                <button @click="activeStatTab = 'perfect'" 
                  class="flex-shrink-0 min-w-[140px] md:min-w-0 flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200"
                  :class="activeStatTab === 'perfect' 
                     ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' 
                     : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300'"
                >
                    <StarIcon class="w-5 h-5 mb-2" :class="activeStatTab === 'perfect' ? 'text-amber-500' : 'text-slate-400'" />
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.perfect.length }}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">6 Étoiles</div>
                </button>

                <button @click="activeStatTab = 'pending'" 
                   class="flex-shrink-0 min-w-[140px] md:min-w-0 flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200"
                   :class="activeStatTab === 'pending' 
                     ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                     : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300'"
                >
                    <Shield class="w-5 h-5 mb-2" :class="activeStatTab === 'pending' ? 'text-red-500' : 'text-slate-400'" />
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.pending.length }}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manquants</div>
                </button>

                <button @click="activeStatTab = 'completed'" 
                   class="flex-shrink-0 min-w-[140px] md:min-w-0 flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200"
                   :class="activeStatTab === 'completed' 
                     ? 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600' 
                     : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300'"
                >
                    <Trophy class="w-5 h-5 mb-2" :class="activeStatTab === 'completed' ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'" />
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.completed.length }}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Terminés</div>
                </button>

                <button @click="activeStatTab = 'struggling'" 
                   class="flex-shrink-0 min-w-[140px] md:min-w-0 flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200"
                   :class="activeStatTab === 'struggling' 
                     ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' 
                     : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:border-slate-300'"
                >
                    <AlertCircle class="w-5 h-5 mb-2" :class="activeStatTab === 'struggling' ? 'text-orange-500' : 'text-slate-400'" />
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stats.struggling.length }}</div>
                    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En Difficulté</div>
                </button>
             </div>

             <!-- LIST CONTENT -->
             <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                <div class="divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar">
                    
                   <template v-if="activeStatTab === 'perfect'">
                     <div v-if="stats.perfect.length === 0" class="p-8 text-center text-slate-500 text-sm">Pas encore de 6 étoiles.</div>
                      <div v-for="m in stats.perfect" :key="m.tag" class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                         <div class="flex items-center gap-3">
                            <div class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-bold text-xs text-amber-600 dark:text-amber-400">
                               {{ m.mapPosition }}
                            </div>
                            <span class="font-bold text-slate-900 dark:text-white text-sm">{{ m.name }}</span>
                         </div>
                         <div class="flex items-center gap-1">
                             <div class="text-xs font-mono text-amber-600">2</div>
                             <StarIcon class="w-3 h-3 text-amber-500" />
                             <div class="ml-1.5 text-xs font-mono text-slate-600">100%</div>
                         </div>
                      </div>
                   </template>

                   <template v-else-if="activeStatTab === 'pending'">
                       <div v-if="stats.pending.length === 0" class="p-8 text-center text-slate-500 text-sm">Tout le monde a attaqué.</div>
                       <div v-for="m in stats.pending" :key="m.tag" class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div class="flex items-center gap-4">
                             <div class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">{{ m.mapPosition }}</div>
                             <div class="text-sm font-bold text-slate-900 dark:text-white">{{ m.name }}</div>
                          </div>
                          <div class="text-xs font-bold px-2 py-1 rounded bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                              - {{ 2 - (m.attacks ? m.attacks.length : 0) }}
                          </div>
                       </div>
                   </template>

                    <template v-else-if="activeStatTab === 'completed'">
                       <div v-if="stats.completed.length === 0" class="p-8 text-center text-slate-500 text-sm">Personne n'a terminé.</div>
                       <div v-for="m in stats.completed" :key="m.tag" class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div class="flex items-center gap-4">
                             <div class="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">{{ m.mapPosition }}</div>
                             <div class="text-sm font-bold text-slate-900 dark:text-white">{{ m.name }}</div>
                          </div>
                          <div class="flex gap-1">
                              <span v-for="atk in m.attacks" :key="atk.order" class="text-xs font-bold" :class="atk.stars===3?'text-green-500':(atk.stars===2?'text-amber-500':'text-red-500')">
                                {{ atk.stars }}★
                              </span>
                          </div>
                       </div>
                   </template>

                   <template v-else-if="activeStatTab === 'struggling'">
                       <div v-if="stats.struggling.length === 0" class="p-8 text-center text-slate-500 text-sm">Aucun échec pour le moment.</div>
                       <div v-for="m in stats.struggling" :key="m.tag" class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div class="flex items-center gap-4">
                             <div class="w-6 h-6 rounded bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center font-bold text-xs text-orange-600">
                               {{ m.mapPosition }}
                             </div>
                             <div class="text-sm font-bold text-slate-900 dark:text-white">{{ m.name }}</div>
                          </div>
                          <div class="flex flex-col items-end gap-1">
                             <div v-for="atk in m.attacks.filter((a: any) => a.stars <= 1)" :key="atk.order" class="flex items-center gap-2">
                                <span class="text-[10px] text-slate-400 mr-1">vs {{ atk.defenderTag }}</span>
                                <span class="text-xs font-bold text-orange-500">{{ atk.stars }}★ <span class="text-slate-600 font-normal">{{ atk.destructionPercentage }}%</span></span>
                             </div>
                          </div>
                       </div>
                   </template>
                </div>
             </div>
           </div>

           <!-- Participants Grid title -->
           <h2 class="text-lg font-bold text-slate-900 dark:text-white mt-12 mb-6 flex items-center gap-2">
             <Users class="w-5 h-5 text-slate-400" /> Tous les participants
           </h2>

           <!-- Participants Grid -->
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             <div v-for="member in participants" :key="member.tag" 
               class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group relative"
             >
               <div class="flex justify-between items-start mb-4">
                 <div class="flex items-center gap-3">
                   <!-- Map POS -->
                   <div class="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-500">
                     {{ member.mapPosition }}
                   </div>
                   <div>
                     <div class="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[120px]">{{ member.name }}</div>
                     <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">HDV {{ member.townhallLevel }}</div>
                   </div>
                 </div>
                 
                 <!-- Status Dots -->
                 <div class="flex gap-1">
                    <div v-for="i in 2" :key="i" class="w-2 h-2 rounded-full"
                      :class="{
                        'bg-green-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 3,
                        'bg-amber-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 2,
                        'bg-red-400': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars <= 1,
                        'bg-slate-200 dark:bg-slate-800': !member.attacks || !member.attacks[i-1]
                      }"
                    ></div>
                 </div>
               </div>

               <!-- Attacks Minimal List -->
               <div class="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                 <template v-if="member.attacks">
                    <div v-for="attack in member.attacks" :key="attack.order" class="flex items-center justify-between text-xs">
                       <span class="text-slate-400 font-mono">#{{ attack.defenderTag }}</span>
                       <span class="font-bold flex items-center gap-1" :class="attack.stars === 3 ? 'text-green-600' : 'text-amber-600'">
                         {{ attack.stars }}★ <span class="text-slate-300 font-light">|</span> {{ attack.destructionPercentage }}%
                       </span>
                    </div>
                 </template>
                 <div v-else class="text-xs text-slate-300 dark:text-slate-700 italic text-center py-1">
                   En attente
                 </div>
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
          <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy class="w-5 h-5 text-amber-500" />
            Historique des guerres
          </h2>
          <span class="text-xs text-slate-400 font-medium">{{ pastWars.length }} guerres enregistrées</span>
        </div>
        
        <div v-if="pastWars.length === 0" class="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
           <Trophy class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
           <p class="text-slate-500 text-sm">Aucun historique disponible.</p>
        </div>

        <div v-else class="space-y-4">
           <button 
             v-for="war in pastWars" 
             :key="war.id"
             @click="fetchWarDetails(war)"
             class="group w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 overflow-hidden cursor-pointer"
           >
              <!-- Top Bar with Result Badge and Date -->
              <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <div class="flex items-center gap-3">

                       <span class="text-xs font-bold uppercase tracking-wider" 
                             :class="war.result === 'win' ? 'text-green-600 dark:text-green-400' : war.result === 'lose' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'">
                         {{ war.result === 'win' ? 'Victoire' : war.result === 'lose' ? 'Défaite' : 'Nul' }}
                       </span>

                 </div>
                 <div class="flex items-center gap-4 text-xs text-slate-400">
                    <div class="flex items-center gap-1.5">
                       <Calendar class="w-3.5 h-3.5" />
                       <span class="font-medium">{{ new Date(war.end_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
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
                       <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl font-black text-slate-600 dark:text-slate-300 shrink-0">
                          {{ war.clan_name?.charAt(0).toUpperCase() }}
                       </div>
                       <div class="min-w-0 flex-1">
                          <div class="font-bold text-slate-900 dark:text-white text-base truncate">{{ war.clan_name }}</div>
                          <div class="text-xs font-mono text-slate-400 truncate">{{ war.clan_tag }}</div>
                          <div class="flex items-center gap-2 mt-1.5">
                             <span class="text-xl font-black text-slate-900 dark:text-white">{{ war.clan_stars }}<span class="text-amber-500 text-sm">★</span></span>
                             <span class="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ war.clan_destruction.toFixed(1) }}%</span>
                          </div>
                       </div>
                    </div>
                    
                    <!-- VS Separator -->
                    <div class="hidden md:flex flex-col items-center justify-center px-4">
                       <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <SwordsIcon class="w-5 h-5 text-slate-400" />
                       </div>
                    </div>
                    
                    <!-- Mobile VS -->
                    <div class="md:hidden flex items-center justify-center">
                       <div class="flex items-center gap-3">
                          <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                          <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                             <SwordsIcon class="w-4 h-4 text-slate-400" />
                          </div>
                          <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                       </div>
                    </div>
                    
                    <!-- Opponent Clan (Right) -->
                    <div class="flex items-center gap-4 md:flex-row-reverse md:text-right">
                       <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl font-black text-slate-500 dark:text-slate-400 shrink-0 opacity-75">
                          {{ war.opponent_name?.charAt(0).toUpperCase() }}
                       </div>
                       <div class="min-w-0 flex-1">
                          <div class="font-bold text-slate-600 dark:text-slate-400 text-base truncate">{{ war.opponent_name }}</div>
                          <div class="text-xs font-mono text-slate-400 truncate">{{ war.opponent_tag }}</div>
                          <div class="flex items-center gap-2 mt-1.5 md:justify-end">
                             <span class="text-xl font-black text-slate-500 dark:text-slate-500">{{ war.opponent_stars }}<span class="text-amber-500/50 text-sm">★</span></span>
                             <span class="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ war.opponent_destruction.toFixed(1) }}%</span>
                          </div>
                       </div>
                    </div>
                    
                 </div>
              </div>

              <!-- Bottom Action Bar -->
              <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
            <div v-if="showWarModal" class="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              
              <!-- Header -->
              <div class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <!-- Top bar with result, date and close button -->
                <div class="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold uppercase tracking-wider" 
                          :class="selectedWarHistory?.result === 'win' ? 'text-green-600 dark:text-green-400' : selectedWarHistory?.result === 'lose' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'">
                      {{ selectedWarHistory?.result === 'win' ? 'Victoire' : selectedWarHistory?.result === 'lose' ? 'Défaite' : 'Nul' }}
                    </span>
                    <span class="text-slate-300 dark:text-slate-600">•</span>
                    <div class="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar class="w-3.5 h-3.5" />
                      <span class="font-medium">{{ selectedWarHistory ? new Date(selectedWarHistory.end_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '' }}</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                      <Users class="w-3 h-3" />
                      <span class="font-bold">{{ selectedWarHistory?.team_size }}v{{ selectedWarHistory?.team_size }}</span>
                    </div>
                  </div>
                  <button @click="closeWarModal" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    <X class="w-5 h-5" />
                  </button>
                </div>
                
                <!-- Both Clans Display -->
                <div class="px-6 py-5">
                  <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center">
                    
                    <!-- Our Clan (Left) -->
                    <div class="flex items-center gap-4">
                      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl font-black text-slate-600 dark:text-slate-300 shrink-0">
                        {{ selectedWarHistory?.clan_name?.charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-slate-900 dark:text-white text-base truncate">{{ selectedWarHistory?.clan_name }}</div>
                        <div class="text-xs font-mono text-slate-400 truncate">{{ selectedWarHistory?.clan_tag }}</div>
                        <div class="flex items-center gap-2 mt-1.5">
                          <span class="text-xl font-black text-slate-900 dark:text-white">{{ selectedWarHistory?.clan_stars }}<span class="text-amber-500 text-sm">★</span></span>
                          <span class="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ selectedWarHistory?.clan_destruction.toFixed(1) }}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- VS Separator -->
                    <div class="hidden md:flex flex-col items-center justify-center px-4">
                      <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <SwordsIcon class="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                    
                    <!-- Mobile VS -->
                    <div class="md:hidden flex items-center justify-center">
                      <div class="flex items-center gap-3 w-full">
                        <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                        <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <SwordsIcon class="w-4 h-4 text-slate-400" />
                        </div>
                        <div class="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                      </div>
                    </div>
                    
                    <!-- Opponent Clan (Right) -->
                    <div class="flex items-center gap-4 md:flex-row-reverse md:text-right">
                      <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-2xl font-black text-slate-500 dark:text-slate-400 shrink-0 opacity-75">
                        {{ selectedWarHistory?.opponent_name?.charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="font-bold text-slate-600 dark:text-slate-400 text-base truncate">{{ selectedWarHistory?.opponent_name }}</div>
                        <div class="text-xs font-mono text-slate-400 truncate">{{ selectedWarHistory?.opponent_tag }}</div>
                        <div class="flex items-center gap-2 mt-1.5 md:justify-end">
                          <span class="text-xl font-black text-slate-500 dark:text-slate-500">{{ selectedWarHistory?.opponent_stars }}<span class="text-amber-500/50 text-sm">★</span></span>
                          <span class="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{{ selectedWarHistory?.opponent_destruction.toFixed(1) }}%</span>
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
                  <div class="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-white"></div>
                  <span class="text-slate-400 text-sm">Chargement...</span>
                </div>
                
                <!-- Stats Overview -->
                <div v-else-if="warParticipants.length > 0" class="space-y-8">
                  
                  <!-- 6 Stars & Missing Attacks -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- Six Stars -->
                    <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-xl p-5 border border-amber-200/50 dark:border-amber-800/30">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                          <StarIcon class="w-4 h-4" />
                          6 Étoiles
                        </h3>
                        <span class="text-sm font-bold px-2.5 py-1 bg-amber-200/50 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-400">{{ historyStats.sixStars.length }}</span>
                      </div>
                      <div v-if="historyStats.sixStars.length > 0" class="space-y-2">
                        <div v-for="player in historyStats.sixStars" :key="player.player_tag" 
                             class="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                          <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded flex items-center justify-center">{{ player.map_position }}</span>
                            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ player.player_name }}</span>
                          </div>
                          <span class="text-sm font-bold text-amber-500">6★</span>
                        </div>
                      </div>
                      <div v-else class="text-sm text-amber-600/70 dark:text-amber-500/70 text-center py-4">Aucun joueur avec 6 étoiles</div>
                    </div>

                    <!-- Missing Attacks -->
                    <div class="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/10 dark:to-red-900/5 rounded-xl p-5 border border-red-200/50 dark:border-red-800/30">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                          <Shield class="w-4 h-4" />
                          Attaques Manquantes
                        </h3>
                        <span class="text-sm font-bold px-2.5 py-1 bg-red-200/50 dark:bg-red-900/30 rounded-full text-red-700 dark:text-red-400">{{ historyStats.missingAttacks.length }}</span>
                      </div>
                      <div v-if="historyStats.missingAttacks.length > 0" class="space-y-2">
                        <div v-for="player in historyStats.missingAttacks" :key="player.player_tag" 
                             class="flex items-center justify-between py-2 px-3 bg-white dark:bg-slate-900/80 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                          <div class="flex items-center gap-3">
                            <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded flex items-center justify-center">{{ player.map_position }}</span>
                            <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ player.player_name }}</span>
                          </div>
                          <span class="text-xs font-bold px-2 py-1 rounded" :class="player.attacks_count === 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'">
                            -{{ 2 - player.attacks_count }} attaque{{ 2 - player.attacks_count > 1 ? 's' : '' }}
                          </span>
                        </div>
                      </div>
                      <div v-else class="text-sm text-green-600 dark:text-green-500 text-center py-4 flex items-center justify-center gap-2">
                        <span>✓</span> Tout le monde a attaqué
                      </div>
                    </div>
                    
                  </div>
                  
                  <!-- All Participants Table -->
                  <div>
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        <Users class="w-4 h-4 text-slate-500" />
                        Tous les participants
                      </h3>
                      <span class="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">{{ warParticipants.length }} joueurs</span>
                    </div>
                    <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      <div class="overflow-x-auto">
                        <table class="w-full">
                          <thead>
                            <tr class="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70">
                              <th class="text-left py-3 pl-4 w-16">
                                <button @click="toggleSort('map_position')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
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
                                        class="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                  Attaques
                                  <template v-if="sortColumn === 'attacks_count'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                              <th class="text-center py-3 w-24">
                                <button @click="toggleSort('stars')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                  Étoiles
                                  <template v-if="sortColumn === 'stars'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                              <th class="text-right py-3 pr-4 w-28">
                                <button @click="toggleSort('destruction')" 
                                        class="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-auto">
                                  Destruction
                                  <template v-if="sortColumn === 'destruction'">
                                    <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                                    <ChevronDown v-else class="w-3 h-3" />
                                  </template>
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                            <tr v-for="player in sortedParticipants" :key="player.player_tag" 
                                class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td class="py-3 pl-4">
                                <span class="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 w-6 h-6 rounded inline-flex items-center justify-center">{{ player.map_position }}</span>
                              </td>
                              <td class="py-3">
                                <span class="text-sm font-semibold text-slate-900 dark:text-white">{{ player.player_name }}</span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">HDV {{ player.town_hall_level }}</span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-xs font-bold px-2 py-1 rounded-full" 
                                      :class="player.attacks_count === 2 
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                        : player.attacks_count === 1 
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'">
                                  {{ player.attacks_count }}/2
                                </span>
                              </td>
                              <td class="py-3 text-center">
                                <span class="text-sm font-bold" :class="player.stars === 6 ? 'text-amber-500' : 'text-slate-600 dark:text-slate-300'">
                                  {{ player.stars }}<span class="text-amber-400">★</span>
                                </span>
                              </td>
                              <td class="py-3 pr-4 text-right">
                                <span class="text-sm font-mono font-medium text-slate-600 dark:text-slate-300">{{ player.destruction.toFixed(1) }}%</span>
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
                  <AlertCircle class="w-10 h-10 text-slate-300 dark:text-slate-600" />
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
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #334155;
}
</style>
