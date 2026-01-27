<script setup lang="ts">
import { 
  Users, 
  Trophy, 
  Calendar,
  Shield,
  Star as StarIcon,
  Swords as SwordsIcon,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  X
} from 'lucide-vue-next'
import type { WarParticipant, WarAttack } from '~/types/war'
import { useWarStats } from '~/composables/useWarStats'

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
const warParticipantsHistory = ref<any[]>([]) // Raw DB data
const loadingWarDetails = ref(false)
const showWarModal = ref(false)

// -- COMPUTED --
const selectedClan = computed(() => trackedClans.value.find(c => c.tag === selectedClanTag.value))

// 1. Current War Data Mapping
const currentWarMembers = computed<WarParticipant[]>(() => {
  if (!currentWar.value?.clan?.members) return []
  
  return currentWar.value.clan.members.map((m: any) => {
    // Current war API structure mapping
    const attacks: WarAttack[] = (m.attacks || []).map((a: any) => ({
      attackerTag: a.attackerTag,
      defenderTag: a.defenderTag,
      stars: a.stars,
      destructionPercentage: a.destructionPercentage,
      order: a.order
    }))

    // Find best opponent attack from opponent members
    let bestOpponentAttack = undefined
    if (m.bestOpponentAttack) {
       // API provides this directly usually, but let's Ensure we get the name
       const attacker = currentWar.value.opponent.members.find((op: any) => op.tag === m.bestOpponentAttack.attackerTag)
       bestOpponentAttack = {
           stars: m.bestOpponentAttack.stars,
           destructionPercentage: m.bestOpponentAttack.destructionPercentage,
           attackerTag: m.bestOpponentAttack.attackerTag,
           attackerName: attacker ? attacker.name : 'Inconnu'
       }
    }

    return {
      tag: m.tag,
      name: m.name,
      mapPosition: m.mapPosition,
      townHallLevel: m.townhallLevel,
      attacks,
      bestOpponentAttack
    }
  }).sort((a: WarParticipant, b: WarParticipant) => a.mapPosition - b.mapPosition)
})

const { stats: currentWarStats } = useWarStats(currentWarMembers)

// 2. History Data Mapping
const historyMembers = computed<WarParticipant[]>(() => {
  if (!warParticipantsHistory.value.length) return []

  return warParticipantsHistory.value.map((p: any) => {
      // Reconstruct simple attack objects for the UI indicators (we only have count/stars in DB usually, 
      // but for this specific "Attacks" column we might need to fake it or just rely on the count/stars if the new component handles it.
      // The shared component expects `attacks` array to show dots.
      // Since we stored `stars` and `attacks_count` in DB but not individual attacks details, we construct placeholder attacks.
      // This is a limitation unless we store full attack JSON. For now we approximate for the visual dots.
      /* 
         We know: attacks_count and stars.
         If count=1, stars=X. One attack of X stars.
         If count=2, total stars=Y. 
         - If Y=6, then 3,3. 
         - If Y=5, then 3,2 or 2,3.
         - If Y=4, then 3,1 or 2,2 or 1,3 ? No simple way.
         
         Decision: For History, we will just pass empty attacks array if we can't be sure, 
         OR we update the component to handle "no detailed attacks available".
         However, the component uses `attacks` length. 
         Let's fill dummy attacks for count.
      */
     
     // Distribute stored stars and destruction across attacks
     const attacks: WarAttack[] = []
     const attacksCount = p.attacks_count || 0
     const totalStars = p.stars || 0
     const totalDestruction = p.destruction || 0
     
     if (attacksCount > 0) {
         // Smart distribution: if 6 stars with 2 attacks = 3+3, if 3 stars with 1 attack = 3, etc.
         // For 2 attacks, divide evenly when possible, otherwise put remainder in first attack
         const avgStarsPerAttack = Math.floor(totalStars / attacksCount)
         const remainderStars = totalStars % attacksCount
         const avgDestructionPerAttack = totalDestruction / attacksCount
         
         for (let i = 0; i < attacksCount; i++) {
             attacks.push({
                 attackerTag: '',
                 defenderTag: '',
                 stars: avgStarsPerAttack + (i < remainderStars ? 1 : 0),
                 destructionPercentage: avgDestructionPerAttack,
                 order: i
             })
         }
     }

     // IF we successfully added the defense columns
     const bestOpponentAttack = (p.defense_stars !== null && p.defense_stars !== undefined) ? {
         stars: p.defense_stars,
         destructionPercentage: p.defense_destruction || 0,
         attackerTag: p.defense_attacker_tag,
         attackerName: 'Adversaire' // We don't have the opponent name stored easily unless we join, or just say 'Adversaire'
     } : undefined

     return {
         tag: p.player_tag,
         name: p.player_name,
         mapPosition: p.map_position,
         townHallLevel: p.town_hall_level,
         attacks, // Note: Individual stars will be missing for history unless we upgrade DB schema to store JSON attacks.
         bestOpponentAttack
     }
  }).sort((a: WarParticipant, b: WarParticipant) => a.mapPosition - b.mapPosition)
})

const { stats: historyStats } = useWarStats(historyMembers)

const isWarActive = computed(() => {
  return currentWar.value && currentWar.value.state !== 'notInWar'
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
    
    // Fetch Current War & History
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
      warParticipantsHistory.value = []
    } else {
      warParticipantsHistory.value = data || []
    }
  } catch (err) {
    console.error(err)
    warParticipantsHistory.value = []
  } finally {
    loadingWarDetails.value = false
  }
}

const closeWarModal = () => {
  showWarModal.value = false
  selectedWarHistory.value = null
  warParticipantsHistory.value = []
}

watch(selectedClanTag, (newVal) => {
  if (newVal) fetchWarData()
})

onMounted(() => {
  fetchTrackedClans()
})
</script>

<template>
  <div class="space-y-8 max-sm:pb-8">
    
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

          <div class="flex flex-wrap items-center gap-3">
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
                            <div class="flex items-center gap-8 md:gap-4 lg:gap-10">
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
            <!-- Stats Cards with shared component -->
             <WarStatsGrid :stats="currentWarStats" />

             <!-- Participants Table with shared component -->
             <WarParticipantsTable :participants="currentWarMembers" class="mt-8" />
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
        <div class="flex flex-wrap items-center justify-between">
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
                  <div class="flex flex-wrap items-center gap-3">
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
                      <span class="font-bold">{{ selectedWarHistory?.team_size }} vs {{ selectedWarHistory?.team_size }}</span>
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
                <div v-else-if="warParticipantsHistory.length > 0" class="space-y-8">
                  <WarStatsGrid :stats="historyStats" />
                  <WarParticipantsTable :participants="historyMembers" />
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
