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
const showGroupRanking = ref(false)

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
    trackedClans.value = data as any[]
    const firstTag = (data as any[])[0]?.tag
    if (firstTag && !selectedClanTag.value) {
      selectedClanTag.value = firstTag as string
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

const selectedLeagueClan = computed(() => leagueClans.value.find(c => c.clan_tag === selectedClanTag.value))

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
  
  // Calculate best performers
  const playersWithStats = leagueParticipants.value.map(p => {
    // A player is "perfect" if they used at least one attack and ALL their attacks are 3-stars
    // Since 3 is max, total_stars === attacks_used * 3 is equivalent to "only 3-star attacks"
    const isPerfect = (p.attacks_used || 0) > 0 && (p.total_stars || 0) === (p.attacks_used || 0) * 3
    const threeStarCount = (p.daily_attacks || []).filter((a: any) => a.stars === 3).length
    return { ...p, isPerfect, threeStarCount }
  })

  // 1. All perfect performers, sorted by number of attacks then destruction
  const perfects = playersWithStats
    .filter(p => p.isPerfect)
    .sort((a, b) => (b.attacks_used - a.attacks_used) || (b.total_destruction - a.total_destruction))

  // 2. Other performers, sorted by three star count, then total stars, then destruction
  const others = playersWithStats
    .filter(p => !p.isPerfect)
    .sort((a, b) => {
      if (b.threeStarCount !== a.threeStarCount) return b.threeStarCount - a.threeStarCount
      if (b.total_stars !== a.total_stars) return b.total_stars - a.total_stars
      return b.total_destruction - a.total_destruction
    })

  // Combine: all perfects + enough others to reach 10 if available
  let combined = [...perfects]
  if (combined.length < 10) {
    combined = [...combined, ...others.slice(0, 10 - combined.length)]
  } else {
    // If more than 10 perfects, limit to 10 as per "max 10 results"
    combined = combined.slice(0, 10)
  }

  // Calculate missing attacks
  const missing = leagueParticipants.value
    .filter(p => (p.attacks_used || 0) < 7)
    .sort((a, b) => (a.attacks_used || 0) - (b.attacks_used || 0))

  return { best: combined, missing }
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Trophy class="w-5 h-5" />
          </div>
          Ligues de Clan
        </h1>

        <div class="flex items-center gap-3">
          <!-- Clan Selector -->
          <div class="relative">
            <select v-model="selectedClanTag" class="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-900 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-w-[160px]">
              <option v-for="clan in trackedClans" :key="clan.tag" :value="clan.tag">{{ clan.name }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <!-- View Switcher -->
          <div class="flex p-1 bg-slate-100 rounded-lg">
            <button @click="viewMode = 'current'" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap" :class="viewMode === 'current' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">Ligue en cours</button>
            <button @click="viewMode = 'results'" class="px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap" :class="viewMode === 'results' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">Historique</button>
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
          
          <div v-if="!leagueGroup || leagueGroup.state === 'notInWar'" class="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Shield class="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 class="text-lg font-bold text-slate-900">Aucune ligue active</h3>
            <p class="text-slate-500 text-sm mt-1">Le clan ne participe pas à la CWL en ce moment.</p>
          </div>

          <div v-else class="space-y-8">
            <!-- League Banner -->
            <div class="bg-indigo-900 rounded-3xl p-8 lg:p-10 text-white relative overflow-hidden shadow-2xl">
              <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
              
              <div class="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div class="text-center md:text-left">
                  <div class="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">Ligue de Guerre - Saison {{ leagueGroup.season }}</div>
                  <div class="flex items-center gap-4 justify-center md:justify-start">
                    <LeagueBadge :name="leagueHistory[0]?.league_name" size="lg" />
                    <h2 class="text-3xl lg:text-4xl font-black">{{ selectedClan?.name }}</h2>
                  </div>
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
            <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
               <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                 <h3 class="font-bold flex items-center gap-2"><ListOrdered class="w-4 h-4 text-indigo-500" /> Classement du groupe</h3>
                 <span class="text-xs text-slate-400">8 Clans</span>
               </div>
               <div class="overflow-x-auto">
                 <table class="w-full text-sm">
                   <thead class="bg-slate-50 text-slate-500 font-semibold">
                     <tr>
                       <th class="px-6 py-3 text-left w-12">#</th>
                       <th class="px-6 py-3 text-left">Clan</th>
                       <th class="px-6 py-3 text-center">Étoiles</th>
                       <th class="px-6 py-3 text-right">Destruction</th>
                     </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-100">
                      <tr v-for="(c, idx) in leagueGroup.clans" :key="c.tag" :class="c.tag === selectedClanTag ? 'bg-slate-50' : ''">
                        <td class="px-6 py-4 font-bold text-slate-400">{{ Number(idx) + 1 }}</td>
                        <td class="px-6 py-4 flex items-center gap-3">
                           <div class="w-8 h-8 shrink-0">
                             <img v-if="c.badgeUrls?.small" :src="c.badgeUrls.small" :alt="c.name" class="w-full h-full object-contain" />
                             <div v-else class="w-full h-full rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                               {{ c.name?.charAt(0) }}
                             </div>
                           </div>
                           <div class="flex flex-col">
                             <span class="font-bold shrink-0" :class="c.tag === selectedClanTag ? 'text-indigo-600' : 'text-slate-900'">{{ c.name }}</span>
                             <span class="text-[10px] text-slate-400 font-mono">{{ c.tag }}</span>
                           </div>
                           <span v-if="c.tag === selectedClanTag" class="text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded ml-1 font-bold uppercase tracking-tighter">Moi</span>
                        </td>
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
                  <button @click="activeStatTab = 'perfect'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'perfect' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'">
                    <StarIcon class="w-5 h-5 mb-1" :class="activeStatTab === 'perfect' ? 'text-amber-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.perfect.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3 Étoiles</span>
                  </button>
                  <button @click="activeStatTab = 'pending'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'pending' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'">
                    <Shield class="w-5 h-5 mb-1" :class="activeStatTab === 'pending' ? 'text-red-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.pending.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En attente</span>
                  </button>
                  <button @click="activeStatTab = 'completed'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'completed' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'">
                    <Trophy class="w-5 h-5 mb-1" :class="activeStatTab === 'completed' ? 'text-indigo-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.completed.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Attaqués</span>
                  </button>
                  <button @click="activeStatTab = 'struggling'" class="p-4 rounded-xl border transition-all flex flex-col items-center" :class="activeStatTab === 'struggling' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'">
                    <AlertCircle class="w-5 h-5 mb-1" :class="activeStatTab === 'struggling' ? 'text-orange-500' : 'text-slate-400'" />
                    <span class="text-xl font-black">{{ currentRoundStats.struggling.length }}</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Échecs</span>
                  </button>
               </div>

               <!-- Participant Grid -->
               <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <div v-for="m in activeWarParticipants" :key="m.tag" class="bg-white p-4 rounded-xl border border-slate-200">
                    <div class="flex justify-between items-start mb-2">
                       <span class="text-[10px] font-bold text-slate-400">#{{ m.mapPosition }}</span>
                       <div class="w-2 h-2 rounded-full" :class="m.attacks?.length ? (m.attacks[0].stars === 3 ? 'bg-green-500' : 'bg-amber-500') : 'bg-slate-200'"></div>
                    </div>
                    <div class="font-bold text-sm mb-1 truncate">{{ m.name }}</div>
                    <div class="text-[10px] text-slate-400 uppercase">HDV {{ m.townhallLevel }}</div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center h-5">
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
            <h2 class="text-lg font-bold flex items-center gap-2 text-slate-900"><Trophy class="w-5 h-5 text-amber-500" /> Historique des saisons</h2>
            <span class="text-xs text-slate-400 font-medium">{{ leagueHistory.length }} saisons enregistrées</span>
          </div>

          <div v-if="!leagueHistory.length" class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <Trophy class="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p class="text-slate-400 text-sm">Aucun historique disponible.</p>
          </div>

          
          <div v-else class="space-y-3">
            <button 
              v-for="h in leagueHistory" 
              :key="h.id" 
              @click="fetchLeagueDetails(h)" 
              class="group w-full flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 bg-white border border-slate-200 rounded-xl transition-all duration-200"
            >
              <!-- Info Section -->
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-gray-100 transition-colors shrink-0">
                  <LeagueBadge :name="h.league_name" size="md">
                    <template #fallback>
                      <Trophy class="w-5 h-5 text-slate-400" />
                    </template>
                  </LeagueBadge>
                </div>
                
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded leading-none">
                      {{ h.season }}
                    </span>
                    <h3 class="font-bold text-slate-900 truncate">{{ h.league_name }}</h3>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-400 font-medium">
                     <div class="flex items-center gap-1">
                        <StarIcon class="w-3 h-3 text-amber-400 fill-amber-400" /> {{ h.total_stars }} étoiles
                     </div>
                     <div class="flex items-center gap-1 tabular-nums">
                        {{ h.total_destruction }}% destruction
                     </div>
                  </div>
                </div>
              </div>

              <!-- Action/Rank Section -->
              <div class="flex items-center justify-between md:justify-end gap-6 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                <div class="flex flex-col items-end">
                   <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Classement</span>
                   <span class="text-xl font-black tabular-nums" :class="h.final_rank === 1 ? 'text-amber-500' : 'text-slate-900'">
                     #{{ h.final_rank }}
                   </span>
                </div>
                <div class="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-500 text-slate-300 transition-all">
                   <ChevronRight class="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- LEAGUE DETAIL MODAL (Clean & Minimalist) -->
    <Teleport to="body">
       <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
       <div v-if="showLeagueModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeLeagueModal"></div>
          
          <!-- Modal Content -->
          <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-8" enter-to-class="opacity-100 scale-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 scale-100 translate-y-0" leave-to-class="opacity-0 scale-95 translate-y-8">
          <div class="relative bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
             
             <!-- Modal Header Bar -->
             <div class="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                <div class="flex items-center gap-4">
                 <div class="flex items-center gap-3">
                   <LeagueBadge :name="selectedLeagueHistory?.league_name" size="sm">
                     <template #fallback>
                       <Trophy class="w-4 h-4 text-slate-400" />
                     </template>
                   </LeagueBadge>
                   <span class="text-sm font-bold text-slate-700">
                      {{ selectedLeagueHistory?.league_name }}
                   </span>
                 </div>
                   <span class="text-sm text-slate-500 flex items-center gap-1.5">
                      <Calendar class="w-3.5 h-3.5" />
                      Saison {{ selectedLeagueHistory?.season }}
                   </span>
                </div>
                <button @click="closeLeagueModal" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                   <X class="w-5 h-5" />
                </button>
             </div>

             <!-- Score Summary (War-style layout) -->
             <div class="px-8 py-6 border-b border-slate-100">
                <div class="flex items-center justify-between">
                   <!-- Our Clan -->
                    <div class="flex items-center gap-4">
                       <div class="w-16 h-16 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                          <img v-if="selectedLeagueClan?.badge_url || selectedClan?.badge_url" :src="selectedLeagueClan?.badge_url || selectedClan?.badge_url" :alt="selectedClan?.name" class="w-full h-full object-contain p-2" />
                          <span v-else class="text-2xl font-black text-slate-300">{{ selectedClan?.name?.charAt(0) }}</span>
                       </div>
                       <div>
                          <div class="font-black text-slate-900 text-xl">{{ selectedClan?.name }}</div>
                          <div class="text-xs font-mono text-slate-400">{{ selectedClanTag }}</div>
                       </div>
                    </div>

                   <!-- Stats Center -->
                  <div class="flex items-center gap-10">

                    <!-- Position -->
                    <div class="flex flex-col items-center text-center space-y-1">
                      <div class="text-lg font-extrabold tracking-tight text-slate-900">
                        #{{ selectedLeagueHistory?.final_rank }}
                      </div>
                      <div class="text-[11px] uppercase tracking-wide text-slate-400">
                        Position
                      </div>
                    </div>
                    <!-- Total Stars -->
                    <div class="flex flex-col items-center text-center space-y-1">
                      <div class="flex items-center gap-1">
                        <span class="text-lg font-extrabold tracking-tight text-slate-900">
                          {{ selectedLeagueHistory?.total_stars }}
                        </span>
                        <StarIcon class="w-4 h-4 text-amber-400 fill-amber-400 -mt-px" />
                      </div>
                      <div class="text-[11px] uppercase tracking-wide text-slate-400">
                        Étoiles
                      </div>
                    </div>
                    <!-- Destruction -->
                    <div class="flex flex-col items-center text-center space-y-1">
                      <div class="text-lg font-extrabold tracking-tight text-slate-900">
                        {{ selectedLeagueHistory?.total_destruction }}%
                      </div>
                      <div class="text-[11px] uppercase tracking-wide text-slate-400">
                        Destruction
                      </div>
                    </div>
                  </div>


                   <!-- Season Info -->
                   <div class="text-right">
                      <div class="font-bold text-slate-900">7 Rounds</div>
                      <div class="text-xs text-slate-400">{{ leagueParticipants.length }} participants</div>
                   </div>
                </div>
             </div>

             <!-- Modal Scrollable Content -->
             <div class="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                
                <!-- Group Rankings (Collapsible) -->
                <div v-if="leagueClans.length > 0" class="rounded-xl border border-slate-200 overflow-hidden">
                   <!-- Header (Clickable) -->
                   <button 
                      @click="showGroupRanking = !showGroupRanking" 
                      class="w-full px-4 py-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                   >
                      <div class="flex items-center gap-3">
                         <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Trophy class="w-4 h-4 text-emerald-600" />
                         </div>
                         <span class="font-semibold text-sm text-slate-700">Classement du groupe</span>
                         <span class="text-xs text-slate-400 bg-white px-2 py-0.5 rounded-full">{{ leagueClans.length }} clans</span>
                      </div>
                      <ChevronDown class="w-5 h-5 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': showGroupRanking }" />
                   </button>
                   
                   <!-- Content (Collapsible) -->
                   <Transition 
                      enter-active-class="transition-all duration-200 ease-out" 
                      enter-from-class="max-h-0 opacity-0" 
                      enter-to-class="max-h-[500px] opacity-100" 
                      leave-active-class="transition-all duration-200 ease-in" 
                      leave-from-class="max-h-[500px] opacity-100" 
                      leave-to-class="max-h-0 opacity-0"
                   >
                      <div v-show="showGroupRanking" class="border-t border-slate-200 overflow-hidden">
                         <div class="p-2 space-y-1 bg-white">
                            <div 
                               v-for="c in leagueClans" 
                               :key="c.clan_tag" 
                               class="px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all"
                               :class="c.clan_tag === selectedClanTag 
                                  ? 'bg-slate-100 shadow-sm' 
                                  : ''"
                            >
                               <!-- Position Badge -->
                               <div 
                                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                  :class="c.clan_tag === selectedClanTag 
                                     ? 'bg-slate-200 text-slate-700' 
                                     : c.group_rank === 1 
                                        ? 'bg-amber-100 text-amber-600' 
                                        : c.group_rank === 2 
                                           ? 'bg-slate-200 text-slate-600' 
                                           : c.group_rank === 3 
                                              ? 'bg-orange-100 text-orange-600' 
                                              : 'bg-slate-100 text-slate-500'"
                                >
                                   {{ c.group_rank }}
                                </div>
                                
                                <!-- Clan Badge -->
                                <div class="w-8 h-8 shrink-0 bg-white rounded-md flex items-center justify-center overflow-hidden border border-slate-100">
                                   <img v-if="c.badge_url" :src="c.badge_url" :alt="c.clan_name" class="w-full h-full object-contain p-1" />
                                   <span v-else class="text-[10px] font-bold text-slate-300">{{ c.clan_name?.charAt(0) }}</span>
                                </div>
                                
                                <!-- Clan Info -->
                               <div class="flex-1 min-w-0">
                                  <div class="font-bold text-sm truncate" :class="c.clan_tag === selectedClanTag ? 'text-slate-900' : 'text-slate-800'">
                                     {{ c.clan_name }}
                                  </div>
                                  <div class="text-[10px] font-medium truncate" :class="c.clan_tag === selectedClanTag ? 'text-slate-500' : 'text-slate-400'">
                                     {{ c.clan_tag }}
                                  </div>
                               </div>
                               
                               <!-- Stats -->
                               <div class="flex items-center gap-2 shrink-0">
                                  <div class="flex items-center gap-1" :class="c.clan_tag === selectedClanTag ? 'text-slate-900' : 'text-slate-600'">
                                     <span class="text-sm font-bold tabular-nums">{{ c.total_stars }}</span>
                                     <StarIcon class="w-3.5 h-3.5" :class="c.clan_tag === selectedClanTag ? 'text-amber-500/80 fill-amber-500/80' : 'text-amber-400 fill-amber-400'" />
                                  </div>
                                  <span class="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded" :class="c.clan_tag === selectedClanTag ? 'bg-slate-200/50 text-slate-600 border border-slate-200' : 'bg-slate-100 text-slate-500'">
                                     {{ c.total_destruction }}%
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </Transition>
                </div>

                <!-- Highlight Cards (War-style) -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <!-- Top Performers Card -->
                   <div class="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                      <div class="px-4 py-3 flex items-center justify-between border-b border-amber-200/50">
                         <div class="flex items-center gap-2 text-amber-600">
                            <StarIcon class="w-4 h-4 text-current" />
                            <span class="font-semibold text-sm">Top Performeurs</span>
                         </div>
                         <span class="text-sm font-bold text-amber-600">{{ leagueSessionStats.best.filter(p => p.isPerfect).length }}</span>
                      </div>
                      <div class="px-4 py-2 space-y-2 max-h-120 overflow-y-auto">
                         <div v-if="leagueSessionStats.best.length > 0">
                            <div v-for="p in leagueSessionStats.best" :key="p.player_tag" class="flex items-center justify-between py-2 border-b border-amber-200/20 last:border-0">
                               <div class="flex items-center gap-3">
                                  <span class="text-xs font-medium text-slate-400 w-6">{{ p.map_position }}</span>
                                  <div class="flex flex-col">
                                    <span class="font-medium text-slate-700 text-sm flex items-center gap-1.5">
                                      {{ p.player_name }}

                                      <img v-if="p.threeStarCount === 7" src="~/assets/img/legend.png" class="w-4 h-4" alt="Legend" />

                                    </span>
                                    <span class="text-[9px] text-slate-500">{{ p.attacks_used }} attaque{{ p.attacks_used > 1 ? 's' : '' }}</span>
                                  </div>
                               </div>
                               <span class="text-xs font-semibold text-amber-500 bg-amber-100 px-2 py-0.5 rounded">
                                  {{ p.threeStarCount }} perfs
                               </span>

                            </div>
                         </div>
                         <div v-else class="py-6 text-center text-slate-400 text-xs">
                            Aucune donnée de performance
                         </div>
                      </div>
                   </div>

                   <!-- Missing Attacks Card -->
                   <div class="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
                      <div class="px-4 py-3 flex items-center justify-between border-b border-red-200/50">
                         <div class="flex items-center gap-2 text-red-500">
                            <AlertCircle class="w-4 h-4" />
                            <span class="font-semibold text-sm">Attaques Manquantes</span>
                         </div>
                         <span class="text-sm font-bold text-red-500">{{ leagueSessionStats.missing.length }}</span>
                      </div>
                      <div class="px-4 py-2 space-y-2 max-h-120 overflow-y-auto">
                         <div v-if="leagueSessionStats.missing.length > 0">
                            <div v-for="p in leagueSessionStats.missing" :key="p.player_tag" class="flex items-center justify-between py-2">
                               <div class="flex items-center gap-3">
                                  <span class="text-xs font-medium text-slate-400 w-6">{{ p.map_position }}</span>
                                  <span class="font-medium text-slate-700 text-sm">{{ p.player_name }}</span>
                               </div>
                               <span class="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded">-{{ 7 - p.attacks_used }} attaque{{ 7 - p.attacks_used > 1 ? 's' : '' }}</span>
                            </div>
                         </div>
                         <div v-else class="py-6 text-center text-green-600 text-xs font-medium">
                            ✓ Toutes les attaques complétées
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Participants Table -->
                <div>
                   <div class="px-4 flex items-center justify-between mb-2.5">
                      <div class="flex items-center gap-2 text-slate-500">
                         <Users class="w-4 h-4" />
                         <span class="font-semibold text-sm">Tous les participants</span>
                      </div>
                      <span class="text-xs font-medium text-slate-500">{{ leagueParticipants.length }} joueurs</span>
                   </div>

                   <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div class="overflow-x-auto">
                         <table class="w-full text-sm">
                            <thead>
                               <tr class="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-100">
                                  <th class="px-4 py-3 text-left w-12">
                                     <button @click="toggleSort('map_position')" class="hover:text-slate-700 flex items-center gap-1">
                                        #
                                        <ChevronUp v-if="sortColumn === 'map_position' && sortDirection === 'asc'" class="w-3 h-3" />
                                        <ChevronDown v-else-if="sortColumn === 'map_position'" class="w-3 h-3" />
                                     </button>
                                  </th>
                                  <th class="px-4 py-3 text-left">Joueur</th>
                                  <th class="px-4 py-3 text-center">HDV</th>
                                  <th class="px-4 py-3 text-center">
                                     <button @click="toggleSort('attacks_used')" class="hover:text-slate-700 flex items-center gap-1 mx-auto">
                                        Attaques
                                        <ChevronUp v-if="sortColumn === 'attacks_used' && sortDirection === 'asc'" class="w-3 h-3" />
                                        <ChevronDown v-else-if="sortColumn === 'attacks_used'" class="w-3 h-3" />
                                     </button>
                                  </th>
                                  <th class="px-4 py-3 text-center">
                                     <button @click="toggleSort('total_stars')" class="hover:text-slate-700 flex items-center gap-1 mx-auto">
                                        Étoiles
                                        <ChevronUp v-if="sortColumn === 'total_stars' && sortDirection === 'asc'" class="w-3 h-3" />
                                        <ChevronDown v-else-if="sortColumn === 'total_stars'" class="w-3 h-3" />
                                     </button>
                                  </th>
                                  <th class="px-4 py-3 text-right">
                                     <button @click="toggleSort('total_destruction')" class="hover:text-slate-700 flex items-center gap-1 ml-auto">
                                        Destruction
                                        <ChevronUp v-if="sortColumn === 'total_destruction' && sortDirection === 'asc'" class="w-3 h-3" />
                                        <ChevronDown v-else-if="sortColumn === 'total_destruction'" class="w-3 h-3" />
                                     </button>
                                  </th>
                               </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                               <tr v-for="p in sortedParticipants" :key="p.player_tag" class="hover:bg-slate-50/50 transition-colors">
                                  <td class="px-4 py-3 text-slate-400 text-xs font-medium">{{ p.map_position }}</td>
                                  <td class="px-4 py-3">
                                     <span class="font-medium text-slate-900">{{ p.player_name }}</span>
                                  </td>
                                  <td class="px-4 py-3 text-center">
                                     <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">HDV {{ p.town_hall_level }}</span>
                                  </td>
                                  <td class="px-4 py-3 text-center">
                                     <span class="font-semibold" :class="p.attacks_used === 7 ? 'text-green-500' : 'text-rose-500'">{{ p.attacks_used }}/7</span>
                                  </td>
                                  <td class="px-4 py-3 text-center">
                                     <span class="font-semibold text-slate-700">
                                      {{ p.total_stars }}
                                      <span class="text-amber-400">★</span>
                                    </span>
                                  </td>
                                  <td class="px-4 py-3 font-medium text-right text-slate-600">
                                    {{ p.total_destruction }} %
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
       </div>
       </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
