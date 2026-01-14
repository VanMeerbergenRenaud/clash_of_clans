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
  X,
  ListOrdered
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()

// -- STATE --
const viewMode = ref<'current' | 'results'>('current')
const loading = ref(false)
const error = ref<string | null>(null)

// Data
const trackedClans = ref<any[]>([])
const selectedClanTag = ref('')
const leagueGroup = ref<any>(null)
const currentWar = ref<any>(null)
const leagueHistory = ref<any[]>([])

// League History Detail Modal
const selectedLeagueHistory = ref<any>(null)
const leagueParticipants = ref<any[]>([])
const leagueClans = ref<any[]>([])
const loadingLeagueDetails = ref(false)
const showLeagueModal = ref(false)

// Sorting and Tabs
const activeStatTab = ref<'pending' | 'perfect' | 'completed' | 'struggling'>('pending')
const sortColumn = ref<'map_position' | 'total_stars' | 'total_destruction' | 'attacks_used' | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

// -- COMPUTED --
const selectedClan = computed(() => trackedClans.value.find(c => c.tag === selectedClanTag.value))

const isLeagueActive = computed(() => {
  return leagueGroup.value && leagueGroup.value.state !== 'notInWar'
})

const activeWarParticipants = computed(() => {
  if (!currentWar.value?.clan?.members) return []
  return [...currentWar.value.clan.members].sort((a: any, b: any) => a.mapPosition - b.mapPosition)
})

// Stats for current war (round)
const currentRoundStats = computed(() => {
  if (!currentWar.value?.clan?.members) return { pending: [], completed: [], perfect: [], struggling: [] }
  
  const pending: any[] = []
  const completed: any[] = []
  const perfect: any[] = []
  const struggling: any[] = []
  
  currentWar.value.clan.members.forEach((m: any) => {
    const attacks = m.attacks || []
    const attacksCount = attacks.length
    
    if (attacksCount === 0) {
      pending.push({ ...m })
    } else {
      completed.push({ ...m })
      if (attacks[0].stars === 3) {
        perfect.push({ ...m })
      } else if (attacks[0].stars <= 1) {
        struggling.push({ ...m })
      }
    }
  })

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
    error.value = `Erreur: ${dbError.message}`
    loading.value = false
    return
  }

  if (data) {
    trackedClans.value = data
    if (data.length > 0 && !selectedClanTag.value) {
      selectedClanTag.value = data[0].tag as string
    }
  }
  
  if (!selectedClanTag.value) loading.value = false
}

const fetchLeagueData = async () => {
  if (!selectedClanTag.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const encodedTag = encodeURIComponent(selectedClanTag.value)
    
    // 1. Fetch current CWL group
    const groupRes = await $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar/leaguegroup`).catch(() => null)
    leagueGroup.value = groupRes

    // 2. Fetch history from DB
    const historyRes = await supabase
      .from('league_history')
      .select('*')
      .eq('clan_tag', selectedClanTag.value)
      .order('season', { ascending: false })
      .limit(10)

    leagueHistory.value = historyRes.data || []

    // 3. If in league, fetch the current/latest war to show round details
    if (groupRes && groupRes.state !== 'notInWar') {
      const warRes = await $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar`).catch(() => null)
      currentWar.value = warRes?.state !== 'notInWar' ? warRes : null
    } else {
      currentWar.value = null
    }

  } catch (err) {
    console.error(err)
    error.value = "Erreur de chargement"
  } finally {
    loading.value = false
  }
}

const fetchLeagueDetails = async (league: any) => {
  loadingLeagueDetails.value = true
  selectedLeagueHistory.value = league
  showLeagueModal.value = true
  
  try {
    const [participantsRes, clansRes] = await Promise.all([
      supabase.from('league_participants').select('*').eq('league_history_id', league.id).order('map_position', { ascending: true }),
      supabase.from('league_clans').select('*').eq('league_history_id', league.id).order('group_rank', { ascending: true })
    ])
    
    leagueParticipants.value = participantsRes.data || []
    leagueClans.value = clansRes.data || []
  } catch (err) {
    console.error(err)
  } finally {
    loadingLeagueDetails.value = false
  }
}

const closeLeagueModal = () => {
  showLeagueModal.value = false
  selectedLeagueHistory.value = null
  leagueParticipants.value = []
  leagueClans.value = []
}

const toggleSort = (column: any) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = column === 'map_position' ? 'asc' : 'desc'
  }
}

const sortedParticipants = computed(() => {
  if (!leagueParticipants.value.length) return []
  const sorted = [...leagueParticipants.value]
  if (sortColumn.value) {
    sorted.sort((a, b) => {
      const aVal = a[sortColumn.value!]
      const bVal = b[sortColumn.value!]
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    })
  }
  return sorted
})

const leagueSessionStats = computed(() => {
  if (!leagueParticipants.value.length) return { best: [], missing: [] }
  
  // Calculate best performers (most 3 stars)
  // We look into daily_attacks JSON if available, or just use total_stars/3 as an estimate 
  // but better to count 3-star attacks specifically from daily_attacks
  const best = leagueParticipants.value
    .map(p => {
      const threeStarCount = (p.daily_attacks || []).filter((a: any) => a.stars === 3).length
      return { ...p, threeStarCount }
    })
    .filter(p => p.threeStarCount >= 5) // At least 5 triples in the week
    .sort((a, b) => b.threeStarCount - a.threeStarCount)
    .slice(0, 5)

  // Calculate missing attacks
  const missing = leagueParticipants.value
    .filter(p => p.attacks_used < 7)
    .sort((a, b) => a.attacks_used - b.attacks_used)

  return { best, missing }
})

watch(selectedClanTag, (newVal) => {
  if (newVal) fetchLeagueData()
})

onMounted(() => {
  fetchTrackedClans()
})
</script>

<template>
  <div class="space-y-8 pb-32">
    
    <!-- HEADER -->
    <div class="flex flex-col gap-5">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Trophy class="w-5 h-5" />
          </div>
          Ligues de Clan
        </h1>

        <div class="flex items-center gap-3">
          <!-- Clan Selector -->
          <div class="relative">
            <select v-model="selectedClanTag" class="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-900 dark:text-white cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[160px]">
              <option v-for="clan in trackedClans" :key="clan.tag" :value="clan.tag">{{ clan.name }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <!-- View Switcher -->
          <div class="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button @click="viewMode = 'current'" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap" :class="viewMode === 'current' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">Ligue en cours</button>
            <button @click="viewMode = 'results'" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap" :class="viewMode === 'results' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">Historique</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT -->
    <div v-if="loading && !leagueGroup && !leagueHistory.length" class="py-32 flex flex-col items-center justify-center">
      <div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
    </div>

    <div v-else>
      <!-- VIEW: CURRENT LEAGUE -->
      <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0">
        <div v-if="viewMode === 'current'" class="space-y-10">
          
          <div v-if="!leagueGroup || leagueGroup.state === 'notInWar'" class="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <Shield class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">Aucune ligue active</h3>
            <p class="text-slate-500 text-sm mt-1">Le clan ne participe pas à la CWL en ce moment.</p>
          </div>

          <div v-else class="space-y-8">
            <!-- League Banner -->
            <div class="bg-indigo-900 dark:bg-indigo-950 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl">
              <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
              
              <div class="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div class="text-center md:text-left">
                  <div class="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">Ligue de Guerre - Saison {{ leagueGroup.season }}</div>
                  <h2 class="text-3xl lg:text-4xl font-black">{{ selectedClan?.name }}</h2>
                  <div class="flex items-center gap-4 mt-4 justify-center md:justify-start">
                    <div class="bg-white/10 px-3 py-1 rounded-full text-xs font-bold border border-white/10 uppercase tracking-tighter">
                      {{ leagueGroup.state === 'inWar' ? 'Combats en cours' : (leagueGroup.state === 'preparation' ? 'Préparation' : 'En attente') }}
                    </div>
                    <div class="text-indigo-200 text-sm flex items-center gap-1.5">
                      <Calendar class="w-4 h-4" /> Rounds {{ leagueGroup.rounds?.length }} / 7
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-8 md:gap-12">
                   <div class="text-center">
                     <div class="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Position</div>
                     <div class="text-4xl font-black">#?</div>
                   </div>
                   <div class="text-center">
                     <div class="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-1">Destruction</div>
                     <div class="text-4xl font-black">--%</div>
                   </div>
                </div>
              </div>
            </div>

            <!-- Standings Table (Simple) -->
            <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
               <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <h3 class="font-bold flex items-center gap-2"><ListOrdered class="w-4 h-4 text-indigo-500" /> Classement du groupe</h3>
                 <span class="text-xs text-slate-400">8 Clans</span>
               </div>
               <div class="overflow-x-auto">
                 <table class="w-full text-sm">
                   <thead class="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                     <tr>
                       <th class="px-6 py-3 text-left w-12">#</th>
                       <th class="px-6 py-3 text-left">Clan</th>
                       <th class="px-6 py-3 text-center">Étoiles</th>
                       <th class="px-6 py-3 text-right">Destruction</th>
                     </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                     <tr v-for="(c, idx) in leagueGroup.clans" :key="c.tag" :class="{ 'bg-indigo-50/50 dark:bg-indigo-900/10': c.tag === selectedClanTag }">
                       <td class="px-6 py-4 font-bold text-slate-400">{{ Number(idx) + 1 }}</td>
                       <td class="px-6 py-4 font-bold">{{ c.name }} <span v-if="c.tag === selectedClanTag" class="text-[10px] bg-indigo-500 text-white px-1.5 rounded ml-1">MOI</span></td>
                       <td class="px-6 py-4 text-center font-mono font-bold">--</td>
                       <td class="px-6 py-4 text-right font-mono">--%</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>

            <!-- Current War Info (If Round Active) -->
            <div v-if="currentWar" class="space-y-6">
               <h2 class="text-lg font-bold flex items-center gap-2 mt-12"><SwordsIcon class="w-5 h-5 text-red-500" /> Round Actuel : vs {{ currentWar.opponent.name }}</h2>
               
               <!-- Quick Stats Tabs -->
               <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button @click="activeStatTab = 'perfect'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'perfect' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'">
                    <StarIcon class="w-5 h-5 mb-1" :class="activeStatTab === 'perfect' ? 'text-amber-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.perfect.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3 Étoiles</span>
                  </button>
                  <button @click="activeStatTab = 'pending'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'pending' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'">
                    <Shield class="w-5 h-5 mb-1" :class="activeStatTab === 'pending' ? 'text-red-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.pending.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En attente</span>
                  </button>
                  <button @click="activeStatTab = 'completed'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'completed' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'">
                    <Trophy class="w-5 h-5 mb-1" :class="activeStatTab === 'completed' ? 'text-indigo-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.completed.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attaqués</span>
                  </button>
                  <button @click="activeStatTab = 'struggling'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'struggling' ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'">
                    <AlertCircle class="w-5 h-5 mb-1" :class="activeStatTab === 'struggling' ? 'text-orange-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.struggling.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Échecs</span>
                  </button>
               </div>

               <!-- Participant Grid -->
               <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div v-for="m in activeWarParticipants" :key="m.tag" class="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div class="flex justify-between items-start mb-2">
                       <span class="text-[10px] font-bold text-slate-400">#{{ m.mapPosition }}</span>
                       <div class="w-2 h-2 rounded-full" :class="m.attacks?.length ? (m.attacks[0].stars === 3 ? 'bg-green-500' : 'bg-amber-500') : 'bg-slate-200 dark:bg-slate-700'"></div>
                    </div>
                    <div class="font-bold text-sm mb-1 truncate">{{ m.name }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">HDV {{ m.townhallLevel }}</div>
                    <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center h-5">
                       <span v-if="m.attacks?.length" class="text-xs font-black text-indigo-500">{{ m.attacks[0].stars }}★ <span class="text-slate-300">|</span> {{ m.attacks[0].destructionPercentage }}%</span>
                       <span v-else class="text-[10px] text-slate-300 italic">En attente</span>
                    </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </Transition>

      <!-- VIEW: RESULTS (History) -->
      <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0">
        <div v-if="viewMode === 'results'" class="space-y-6">
          <div class="flex items-center justify-between px-2">
            <h2 class="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Trophy class="w-5 h-5 text-amber-500" /> Historique des saisons</h2>
            <span class="text-xs text-slate-400 font-medium">{{ leagueHistory.length }} saisons enregistrées</span>
          </div>

          <div v-if="!leagueHistory.length" class="text-center py-24 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <Trophy class="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <p class="text-slate-400 text-sm">Aucun historique disponible.</p>
          </div>

          <div v-else class="grid grid-cols-1 gap-5">
            <button 
              v-for="h in leagueHistory" 
              :key="h.id" 
              @click="fetchLeagueDetails(h)" 
              class="group w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/50 transition-all duration-300 overflow-hidden shadow-sm"
            >
              <!-- Top Bar (Minimalist) -->
              <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                    Saison {{ h.season }}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-xs text-slate-400">
                   <div class="flex items-center gap-1.5 font-medium">
                      <Calendar class="w-3.5 h-3.5" /> 7 Jours
                   </div>
                </div>
              </div>

              <!-- Main Card Content -->
              <div class="p-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div class="flex items-center gap-5">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                      <Trophy class="w-7 h-7" />
                    </div>
                    <div>
                      <h3 class="text-xl font-black text-slate-900 dark:text-white leading-tight">{{ h.league_name }}</h3>
                      <div class="flex items-center gap-3 mt-1.5">
                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <StarIcon class="w-3.5 h-3.5 text-amber-500 fill-current" /> {{ h.total_stars }}
                        </div>
                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                          {{ h.total_destruction }}%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-8 self-end md:self-center">
                    <div class="text-right">
                       <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rang Final</div>
                       <div class="text-3xl font-black tabular-nums" :class="h.final_rank === 1 ? 'text-amber-500' : 'text-slate-900 dark:text-white'">
                         #{{ h.final_rank }}
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bottom Action Bar (Minimalist) -->
              <div class="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-500 transition-colors">Détails de la saison</span>
                <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- LEAGUE DETAIL MODAL (Minimalist Alignment) -->
    <Teleport to="body">
       <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
       <div v-if="showLeagueModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeLeagueModal"></div>
          
          <!-- Modal Content -->
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-8" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 translate-y-8">
          <div class="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
             
             <!-- Modal Header (Minimalist) -->
             <div class="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div class="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                   <div class="flex items-center gap-3">
                      <span class="text-[10px] font-black uppercase tracking-widest text-indigo-500">Saison {{ selectedLeagueHistory?.season }}</span>
                      <span class="text-slate-300 dark:text-slate-700">•</span>
                      <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">{{ selectedLeagueHistory?.league_name }}</span>
                   </div>
                   <button @click="closeLeagueModal" class="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"><X class="w-5 h-5" /></button>
                </div>

                <div class="px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6">
                   <div class="flex items-center gap-5">
                      <div class="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shrink-0">
                         <Trophy class="w-8 h-8" />
                      </div>
                      <div>
                         <h2 class="text-2xl font-black text-slate-900 dark:text-white leading-tight">Résultats de Ligue</h2>
                         <div class="flex items-center gap-2 mt-1">
                            <span class="text-3xl font-black text-slate-900 dark:text-white">#{{ selectedLeagueHistory?.final_rank }}</span>
                            <span class="text-sm font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">Position Finale</span>
                         </div>
                      </div>
                   </div>

                   <div class="flex gap-4">
                      <div class="text-center px-6 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                         <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Étoiles</div>
                         <div class="text-xl font-black text-indigo-500">{{ selectedLeagueHistory?.total_stars }}★</div>
                      </div>
                      <div class="text-center px-6 py-3 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                         <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Dest.</div>
                         <div class="text-xl font-black text-indigo-500 font-mono">{{ selectedLeagueHistory?.total_destruction }}%</div>
                      </div>
                   </div>
                </div>
             </div>

             <!-- Modal Scrollable Content -->
             <div class="p-8 space-y-12 overflow-y-auto custom-scrollbar flex-1">
                
                <!-- Group Rankings (Simplified Grid) -->
                <section>
                   <div class="flex items-center gap-3 mb-6">
                      <div class="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                      <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Classement du Groupe</h3>
                   </div>
                   <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div v-for="c in leagueClans" :key="c.clan_tag" 
                           class="p-4 rounded-2xl border transition-all flex flex-col items-center justify-center text-center shadow-sm" 
                           :class="c.clan_tag === selectedClanTag ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/10' : 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'"
                      >
                         <span class="text-[10px] font-black text-slate-400 mb-1">POS #{{ c.group_rank }}</span>
                         <div class="font-bold text-sm truncate w-full px-2" :class="c.clan_tag === selectedClanTag ? 'text-indigo-600 dark:text-indigo-400 underline underline-offset-4' : 'text-slate-700 dark:text-slate-300'">{{ c.clan_name }}</div>
                         <div class="mt-2 text-xs font-black tabular-nums">{{ c.total_stars }}★ <span class="text-[10px] font-medium text-slate-400 mx-1">/</span> {{ c.total_destruction }}%</div>
                      </div>
                   </div>
                </section>

                <!-- Best Performers & Alerts (Minimalist List Style) -->
                <section class="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <!-- Top Performers -->
                   <div class="space-y-5">
                      <div class="flex items-center gap-3">
                         <div class="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                         <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Top Perforfeurs</h3>
                      </div>
                      <div v-if="leagueSessionStats.best.length > 0" class="space-y-2.5">
                         <div v-for="p in leagueSessionStats.best" :key="p.player_tag" class="relative group p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-all hover:bg-amber-50 dark:hover:bg-amber-900/10">
                            <div class="flex items-center gap-4">
                               <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 font-black text-xs">{{ p.map_position }}</div>
                               <div class="font-bold text-sm text-slate-700 dark:text-slate-300">{{ p.player_name }}</div>
                            </div>
                            <div class="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-black text-amber-500">
                               {{ p.threeStarCount }} <StarIcon class="w-3.5 h-3.5 fill-current" />
                            </div>
                         </div>
                      </div>
                      <div v-else class="py-12 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs italic">Aucun joueur avec +5 triples</div>
                   </div>

                   <!-- Missing Attacks -->
                   <div class="space-y-5">
                      <div class="flex items-center gap-3">
                         <div class="w-1.5 h-6 bg-red-500 rounded-full"></div>
                         <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Alertes Attaques</h3>
                      </div>
                      <div v-if="leagueSessionStats.missing.length > 0" class="space-y-2.5">
                         <div v-for="p in leagueSessionStats.missing" :key="p.player_tag" class="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-all hover:bg-red-50 dark:hover:bg-red-900/10">
                            <div class="flex items-center gap-4">
                               <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-black text-xs">{{ p.map_position }}</div>
                               <div class="font-bold text-sm text-slate-700 dark:text-slate-300">{{ p.player_name }}</div>
                            </div>
                            <div class="text-[10px] font-black uppercase text-red-500 px-3 py-1 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-full">
                               {{ 7 - p.attacks_used }} manquantes
                            </div>
                         </div>
                      </div>
                      <div v-else class="py-12 bg-green-50/30 dark:bg-green-900/10 rounded-3xl border border-dashed border-green-200 dark:border-green-800/50 text-center text-green-600 dark:text-green-400 text-xs font-bold px-6">
                         ✓ Tous les joueurs ont complété leurs 7 attaques !
                      </div>
                   </div>
                </section>

                <!-- Full Participant Table (Minimalist) -->
                <section>
                   <div class="flex items-center justify-between mb-8">
                      <div class="flex items-center gap-3">
                         <div class="w-1.5 h-6 bg-slate-400 rounded-full"></div>
                         <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Performances des Joueurs</h3>
                      </div>
                      <span class="text-[11px] font-black text-slate-400 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full tabular-nums">{{ leagueParticipants.length }} JOUEURS</span>
                   </div>
                   
                   <div class="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                      <div class="overflow-x-auto">
                         <table class="w-full text-sm">
                            <thead>
                               <tr class="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 text-[10px] tracking-widest">
                                  <th class="px-6 py-4 text-left w-20">
                                     <button @click="toggleSort('map_position')" class="hover:text-indigo-500 uppercase flex items-center gap-1.5"># <ChevronDown v-if="sortColumn === 'map_position'" class="w-3 h-3" :class="{ 'rotate-180': sortDirection === 'asc' }" /></button>
                                  </th>
                                  <th class="px-6 py-4 text-left">JOUEUR / HDV</th>
                                  <th class="px-6 py-4 text-center w-28">
                                     <button @click="toggleSort('attacks_used')" class="hover:text-indigo-500 uppercase mx-auto flex items-center gap-1.5">ATTR / 7 <ChevronDown v-if="sortColumn === 'attacks_used'" class="w-3 h-3" :class="{ 'rotate-180': sortDirection === 'asc' }" /></button>
                                  </th>
                                  <th class="px-6 py-4 text-center w-28">
                                     <button @click="toggleSort('total_stars')" class="hover:text-indigo-500 uppercase mx-auto flex items-center gap-1.5">ÉTOILES <ChevronDown v-if="sortColumn === 'total_stars'" class="w-3 h-3" :class="{ 'rotate-180': sortDirection === 'asc' }" /></button>
                                  </th>
                                  <th class="px-6 py-4 text-right pr-6 w-32">
                                     <button @click="toggleSort('total_destruction')" class="hover:text-indigo-500 uppercase ml-auto flex items-center gap-1.5">DEST. (%) <ChevronDown v-if="sortColumn === 'total_destruction'" class="w-3 h-3" :class="{ 'rotate-180': sortDirection === 'asc' }" /></button>
                                  </th>
                               </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50 dark:divide-slate-800/50">
                               <tr v-for="p in sortedParticipants" :key="p.player_tag" class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors tabular-nums">
                                  <td class="px-6 py-4 font-black text-slate-300 text-xs">{{ p.map_position }}</td>
                                  <td class="px-6 py-4">
                                     <div class="font-bold text-slate-700 dark:text-slate-200">{{ p.player_name }}</div>
                                     <div class="text-[10px] text-slate-400 font-medium">Hôtel de ville {{ p.town_hall_level }}</div>
                                  </td>
                                  <td class="px-6 py-4 text-center">
                                     <span class="text-xs font-bold" :class="p.attacks_used < 7 ? 'text-amber-500' : 'text-slate-400'">{{ p.attacks_used }}</span>
                                  </td>
                                  <td class="px-6 py-4 text-center">
                                     <span class="font-black text-slate-900 dark:text-white">{{ p.total_stars }}★</span>
                                  </td>
                                  <td class="px-6 py-4 text-right pr-6">
                                     <span class="font-bold text-slate-600 dark:text-slate-400 decoration-slate-300 decoration-dotted">{{ p.total_destruction }}%</span>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                      </div>
                   </div>
                </section>
             </div>
          </div>
          </Transition>
       </div>
       </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
</style>
