<script setup lang="ts">
import { 
  Users, 
  Trophy, 
  Swords, 
  Calendar,
  Crosshair,
  Shield,
  Star as StarIcon,
  Swords as SwordsIcon,
  ChevronRight,
  AlertCircle
} from 'lucide-vue-next'
import UiBadge from '~/components/ui/Badge.vue'

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
       supabase.from('wars').select('*').eq('clan_tag', selectedClanTag.value).order('end_date', { ascending: false }).limit(20)
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

watch(selectedClanTag, (newVal) => {
  if (newVal) fetchWarData()
})

onMounted(() => {
  fetchTrackedClans()
})
</script>

<template>
  <div class="space-y-8 pb-32">
    
    <!-- HEADER: Minimalist + Clan Selector -->
    <div class="flex flex-col gap-6">
       <!-- Top Row: Title & View Switcher -->
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
             <div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white">
               <SwordsIcon class="w-5 h-5" />
             </div>
             Guerres
          </h1>

          <!-- Minimalist Segmented Control -->
          <div class="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start md:self-center">
             <button 
               @click="viewMode = 'participants'"
               class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
               :class="viewMode === 'participants' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
             >
               Participants
             </button>
             <button 
               @click="viewMode = 'results'"
               class="px-4 py-1.5 rounded-md text-sm font-medium transition-all"
               :class="viewMode === 'results' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
             >
               Historique
             </button>
          </div>
       </div>
       
       <!-- Clan Selector Pills -->
       <div class="flex flex-wrap gap-2">
          <button 
            v-for="clan in trackedClans" 
            :key="clan.tag"
            @click="selectedClanTag = clan.tag"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all border outline-none"
            :class="selectedClanTag === clan.tag 
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm' 
              : 'bg-transparent text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'"
          >
            {{ clan.name }}
          </button>
          
          <div v-if="loading && trackedClans.length === 0" class="animate-pulse flex gap-2">
             <div class="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
             <div class="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          </div>
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
           <div class="bg-slate-900 dark:bg-black rounded-3xl p-8 lg:p-10 text-white shadow-2xl relative overflow-hidden">
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
                         <div class="flex items-center gap-2">
                             <StarIcon class="w-3 h-3 text-amber-500" />
                             <div class="text-xs font-mono text-slate-400">100%</div>
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
                                <span class="text-xs font-bold text-orange-500">{{ atk.stars }}★ <span class="text-slate-300 font-normal">{{ atk.destructionPercentage }}%</span></span>
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
      <div v-if="viewMode === 'results'" key="results" class="space-y-4">
        
        <div v-if="pastWars.length === 0" class="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
           <Trophy class="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
           <p class="text-slate-500 text-sm">Aucun historique disponible.</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-3">
           <div 
             v-for="war in pastWars" 
             :key="war.id"
             class="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
           >
              <div class="flex items-center gap-4 w-full sm:w-auto">
                 <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                  :class="war.result === 'win' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'"
                 >
                    {{ war.result === 'win' ? 'W' : 'L' }}
                 </div>
                 <div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm">vs {{ war.opponent_name }}</div>
                    <div class="text-xs text-slate-400">{{ new Date(war.end_date).toLocaleDateString() }}</div>
                 </div>
              </div>

              <div class="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end">
                 <!-- Score -->
                 <div class="flex items-center gap-3">
                    <div class="text-right">
                       <span class="block font-bold text-slate-900 dark:text-white">{{ war.clan_stars }}</span>
                       <span class="block text-[10px] text-slate-400">{{ war.clan_destruction.toFixed(1) }}%</span>
                    </div>
                    <span class="text-slate-300">/</span>
                    <div class="text-left">
                       <span class="block font-bold text-slate-500">{{ war.opponent_stars }}</span>
                       <span class="block text-[10px] text-slate-400">{{ war.opponent_destruction.toFixed(1) }}%</span>
                    </div>
                 </div>
                 <ChevronRight class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
           </div>
        </div>
      </div>
      </Transition>

    </div>
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
