<script setup lang="ts">
import { Shield, Users, Trophy, AlertCircle, Loader2, ChevronDown, ChevronUp, Plus, Trash2, Swords } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const profile = ref<any>(null)
const trackedClans = ref<any[]>([])
const loadingClans = ref(true)
const activeTab = ref('status')
const showAddClanModal = ref(false)
const newClan = ref({ name: '', tag: '' })
const isAddingClan = ref(false)

interface ClanData {
  tag: string
  name: string
  warLeague?: {
    name: string
    id: number
  }
  members: number
  clanLevel: number
}

interface LeagueGroupData {
  state: string
  season: string
  rounds: { warTags: string[] }[]
  clans: any[]
}

interface PlayerStats {
  tag: string
  name: string
  stars: number
  destructionPercentage: number
  attacks: number
}

interface ClanState {
  info: ClanData | null
  leagueGroup: LeagueGroupData | null
  currentWar: any | null
  playerStats: PlayerStats[]
  leagueHistory: any[]
  loading: boolean
  loadingStats: boolean
  error: string | null
  showStats: boolean
  showWarDetails: boolean
  showHistory: boolean
}

const clansData = ref<Record<string, ClanState>>({})

const fetchProfile = async () => {
  if (!user.value?.id) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  profile.value = data
}

const fetchTrackedClans = async () => {
  loadingClans.value = true
  const { data, error } = await (supabase.from('tracked_clans') as any).select('*')
  if (!error && data) {
    trackedClans.value = data as any[]
    // Initialize data structure for new clans
    (data as any[]).forEach(c => {
      if (!clansData.value[c.tag]) {
        clansData.value[c.tag] = { 
          info: null, 
          leagueGroup: null, 
          currentWar: null,
          playerStats: [],
          leagueHistory: [],
          loading: false, 
          loadingStats: false,
          error: null,
          showStats: false,
          showWarDetails: false,
          showHistory: false
        }
      }
    })
    await fetchClansData()
  }
  loadingClans.value = false
}

const isAdmin = computed(() => profile.value?.user_type === 'admin')

const clanViewModels = computed(() => {
  return trackedClans.value.map(clan => ({
    ...clan,
    state: clansData.value[clan.tag] || { 
      info: null, 
      leagueGroup: null, 
      currentWar: null,
      playerStats: [],
      leagueHistory: [],
      loading: false, 
      loadingStats: false,
      error: 'Initialization Error',
      showStats: false,
      showWarDetails: false,
      showHistory: false
    }
  }))
})

const fetchWarDetails = async (clanTag: string) => {
  const state = clansData.value[clanTag]
  if (!state || !state.leagueGroup) return

  state.loadingStats = true
  const playerStatsMap = new Map<string, PlayerStats>()

  try {
    for (const round of state.leagueGroup.rounds) {
      for (const warTag of round.warTags) {
        try {
          const encodedWarTag = encodeURIComponent(warTag)
          const warData = await $fetch<any>(`/api/coc/clanwarleagues/wars/${encodedWarTag}`)
          const ourClan = warData.clan?.tag === clanTag ? warData.clan : 
                         warData.opponent?.tag === clanTag ? warData.opponent : null
          if (!ourClan || !ourClan.members) continue
          for (const member of ourClan.members) {
            const tag = member.tag
            const existing = playerStatsMap.get(tag) || {
              tag, name: member.name, stars: 0, destructionPercentage: 0, attacks: 0
            }
            if (member.attacks) {
              for (const attack of member.attacks) {
                existing.stars += attack.stars || 0
                existing.destructionPercentage += attack.destructionPercentage || 0
                existing.attacks += 1
              }
            }
            playerStatsMap.set(tag, existing)
          }
        } catch (err) {}
      }
    }
    const playerStats = Array.from(playerStatsMap.values())
    playerStats.sort((a, b) => {
      if (b.stars !== a.stars) return b.stars - a.stars
      return b.destructionPercentage - a.destructionPercentage
    })
    state.playerStats = playerStats
  } catch (err: any) {
    console.error('Error fetching war details:', err)
  } finally {
    state.loadingStats = false
  }
}

const toggleStats = async (clanTag: string) => {
  const state = clansData.value[clanTag]
  if (!state) return
  state.showStats = !state.showStats
  if (state.showStats && state.playerStats.length === 0) {
    await fetchWarDetails(clanTag)
  }
}

const toggleWarDetails = (clanTag: string) => {
  const state = clansData.value[clanTag]
  if (!state) return
  state.showWarDetails = !state.showWarDetails
}

const toggleHistory = async (clanTag: string) => {
  const state = clansData.value[clanTag]
  if (!state) return
  state.showHistory = !state.showHistory
  if (state.showHistory && state.leagueHistory.length === 0) {
    const { data } = await supabase
      .from('league_history')
      .select('*')
      .eq('clan_tag', clanTag)
      .order('season', { ascending: false })
    state.leagueHistory = data || []
  }
}

const fetchClansData = async () => {
  // Parallel fetch for all clans
  await Promise.all(trackedClans.value.map(async (clan) => {
    const encodedTag = encodeURIComponent(clan.tag)
    const state = clansData.value[clan.tag]
    if (!state) return

    state.loading = true
    try {
      const [infoData, groupData, warData] = await Promise.all([
        $fetch<ClanData>(`/api/coc/clans/${encodedTag}`),
        $fetch<LeagueGroupData>(`/api/coc/clans/${encodedTag}/currentwar/leaguegroup`).catch(() => null),
        $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar`).catch(() => null)
      ])

      state.info = infoData
      state.leagueGroup = groupData
      state.currentWar = warData?.state !== 'notInWar' ? warData : null
      
      if (state.showStats) {
        await fetchWarDetails(clan.tag)
      }
    } catch (err: any) {
      state.error = "Erreur de chargement"
      console.error(`Error fetching data for ${clan.tag}:`, err)
    } finally {
      state.loading = false
    }
  }))
}

const handleAddClan = async () => {
  if (!newClan.value.tag) return
  isAddingClan.value = true
  const { error } = await (supabase.from('tracked_clans') as any).insert([newClan.value])
  if (!error) {
    await fetchTrackedClans()
    showAddClanModal.value = false
    newClan.value = { name: '', tag: '' }
  } else {
    alert(error.message)
  }
  isAddingClan.value = false
}

const handleDeleteClan = async (tag: string) => {
  if (!confirm('Arrêter de suivre ce clan ?')) return
  const { error } = await supabase.from('tracked_clans').delete().eq('tag', tag)
  if (!error) {
    await fetchTrackedClans()
  } else {
    alert(error.message)
  }
}



onMounted(async () => {
  await fetchProfile()
  await fetchTrackedClans()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield class="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Ligues de Guerre (CWL)
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Suivi des clans enregistrés</p>
      </div>
      <div class="flex gap-2">
        <UiButton v-if="isAdmin" variant="primary" :icon="Plus" @click="showAddClanModal = true">Ajouter un clan</UiButton>
        <UiButton variant="outline" :icon="Users" @click="fetchClansData">Actualiser</UiButton>
      </div>
    </div>

    <!-- Content -->
    <div v-if="loadingClans" class="flex justify-center py-20">
      <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
    </div>

    <div v-else-if="trackedClans.length === 0" class="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
      <div class="max-w-md mx-auto space-y-4">
        <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield class="w-10 h-10 text-slate-400" />
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Aucun clan suivi</h2>
        <p class="text-slate-500">Ajoutez votre premier clan pour commencer à suivre ses performances en ligue.</p>
        <div class="pt-4 flex flex-col items-center gap-3">
          <UiButton v-if="isAdmin" variant="primary" :icon="Plus" @click="showAddClanModal = true">Ajouter un clan</UiButton>
          <p v-else class="text-sm text-slate-400 italic">Demandez à un administrateur d'ajouter un clan.</p>
        </div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-6">
      <div v-for="clan in clanViewModels" :key="clan.tag">
        <UiCard :title="clan.name">
          <template #header>
             <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
               <span class="text-sm text-slate-500">{{ clan.tag }}</span>
               <UiButton 
                 v-if="isAdmin" 
                 variant="ghost" 
                 size="sm" 
                 :icon="Trash2" 
                 class="text-red-500 hover:text-red-600 h-8"
                 @click="handleDeleteClan(clan.tag)"
               >
                 Supprimer
               </UiButton>
             </div>
          </template>

          <div v-if="clan.state.loading" class="flex justify-center py-8">
            <Loader2 class="w-8 h-8 text-indigo-600 animate-spin" />
          </div>

          <div v-else-if="clan.state.error" class="py-4">
            <UiAlert variant="destructive" title="Erreur">
              {{ clan.state.error }}
            </UiAlert>
          </div>

          <div v-else class="space-y-6">
            <!-- Basic Info (Clickable to toggle stats) -->
            <div 
              @click="toggleStats(clan.tag)"
              class="flex items-center gap-6 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              :class="{ 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700': clan.state.showStats }"
            >
              <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-xl font-bold text-slate-900 dark:text-white">
                      {{ clan.state.info?.warLeague?.name || 'Pas de ligue' }}
                    </h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-slate-500 text-sm">Niveau {{ clan.state.info?.clanLevel }}</span>
                      <span class="text-slate-300 dark:text-slate-600">•</span>
                      <span class="text-slate-500 text-sm">{{ clan.state.info?.members }} membres</span>
                    </div>
                  </div>
                  <component :is="clan.state.showStats ? ChevronUp : ChevronDown" class="w-6 h-6 text-slate-400" />
                </div>
              </div>
            </div>

            <!-- League Group Status -->
            <div v-if="clan.state.leagueGroup" class="space-y-4">
              <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                <h4 class="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                  Saison {{ clan.state.leagueGroup?.season }} - {{ clan.state.leagueGroup?.state }}
                </h4>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                  Clans dans le groupe :
                </p>
                <div class="flex flex-wrap gap-2">
                  <span v-for="c in clan.state.leagueGroup?.clans" :key="c.tag"
                    class="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    {{ c.name }}
                  </span>
                </div>
              </div>

              <!-- Player Stats Table -->
              <div v-if="clan.state.showStats" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div v-if="clan.state.loadingStats" class="flex justify-center py-8">
                  <Loader2 class="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
                
                <div v-else-if="clan.state.playerStats.length === 0" class="p-8 text-center text-slate-500">
                  Aucune statistique disponible
                </div>

                <div v-else class="overflow-x-auto">
                  <table class="w-full">
                    <thead class="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          #
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Joueur
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          ⭐ Étoiles
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          💥 Dest. Totale
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          ⚔️ Attaques
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                      <tr 
                        v-for="(player, index) in clan.state.playerStats" 
                        :key="player.tag"
                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td class="px-4 py-3 text-sm font-medium text-slate-500">
                          {{ (index as any) + 1 }}
                        </td>
                        <td class="px-4 py-3">
                          <div class="font-medium text-slate-900 dark:text-white">{{ player.name }}</div>
                          <div class="text-xs text-slate-400">{{ player.tag }}</div>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            {{ player.stars }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {{ player.destructionPercentage.toFixed(1) }}%
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {{ player.attacks }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-500 text-sm">
                Aucune information de Ligue de Guerre (CWL) disponible.
              </div>
              
              <!-- Standard War Quick Info if exists -->
              <div v-if="clan.state.currentWar" class="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <Swords class="w-4 h-4 text-amber-600" />
                    <span class="font-bold text-amber-900 dark:text-amber-200">Guerre Classique</span>
                    <UiBadge :variant="clan.state.currentWar.state === 'inWar' ? 'success' : 'info'">
                      {{ clan.state.currentWar.state === 'inWar' ? 'En cours' : 'Préparation' }}
                    </UiBadge>
                  </div>
                  <button @click="toggleWarDetails(clan.tag)" class="text-xs text-amber-700 dark:text-amber-400 font-medium hover:underline">
                    {{ clan.state.showWarDetails ? 'Cacher' : 'Détails' }}
                  </button>
                </div>
                
                <div class="flex items-center justify-between text-sm">
                  <div class="text-center flex-1">
                    <div class="font-bold text-slate-900 dark:text-white">{{ clan.state.currentWar.clan.stars }} ⭐</div>
                    <div class="text-xs text-slate-500">{{ clan.state.currentWar.clan.destructionPercentage.toFixed(1) }}%</div>
                  </div>
                  <div class="px-4 font-black text-slate-300">VS</div>
                  <div class="text-center flex-1">
                    <div class="font-bold text-slate-900 dark:text-white">{{ clan.state.currentWar.opponent.stars }} ⭐</div>
                    <div class="text-xs text-slate-500">{{ clan.state.currentWar.opponent.destructionPercentage.toFixed(1) }}%</div>
                  </div>
                </div>

                <!-- Expanded Standard War Details -->
                <div v-if="clan.state.showWarDetails" class="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-900/30 space-y-3">
                   <div class="flex justify-between text-xs">
                     <span class="text-slate-500">Adversaire:</span>
                     <span class="font-bold text-slate-700 dark:text-slate-300">{{ clan.state.currentWar.opponent.name }}</span>
                   </div>
                   <div class="flex justify-between text-xs">
                     <span class="text-slate-500">Taille:</span>
                     <span class="font-bold text-slate-700 dark:text-slate-300">{{ clan.state.currentWar.teamSize }} vs {{ clan.state.currentWar.teamSize }}</span>
                   </div>
                   <div class="flex justify-between text-xs">
                     <span class="text-slate-500">Attaques:</span>
                     <span class="font-bold text-slate-700 dark:text-slate-300 text-right">
                       Nous: {{ clan.state.currentWar.clan.attacks }} / {{ clan.state.currentWar.teamSize * 2 }}<br>
                       Eux: {{ clan.state.currentWar.opponent.attacks }} / {{ clan.state.currentWar.teamSize * 2 }}
                     </span>
                   </div>
                 </div>
              </div>

              <!-- League History Section -->
              <div class="border-t border-slate-100 dark:border-slate-800 pt-4">
                <button 
                  @click="toggleHistory(clan.tag)"
                  class="flex items-center justify-between w-full p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <Trophy class="w-4 h-4 text-amber-500" />
                    <span class="font-semibold text-slate-700 dark:text-slate-200">Historique des Ligues</span>
                  </div>
                  <component :is="clan.state.showHistory ? ChevronUp : ChevronDown" class="w-4 h-4 text-slate-400" />
                </button>

                <div v-if="clan.state.showHistory" class="mt-4 space-y-3">
                  <div v-if="clan.state.leagueHistory.length === 0" class="text-center py-4 text-sm text-slate-500 italic">
                    Aucun historique enregistré pour ce clan.
                  </div>
                  <div 
                    v-for="hist in clan.state.leagueHistory" 
                    :key="hist.id"
                    class="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <div class="font-bold text-slate-900 dark:text-white">{{ hist.season }}</div>
                      <div class="text-xs text-slate-500">{{ hist.league_name }}</div>
                    </div>
                    <div class="text-right">
                      <div class="flex items-center gap-2">
                        <UiBadge :variant="hist.result === 'promoted' ? 'success' : (hist.result === 'demoted' ? 'danger' : 'info')">
                          {{ hist.rank }}e place
                        </UiBadge>
                      </div>
                      <div class="text-[10px] text-slate-400 mt-1">{{ hist.stars }}⭐ • {{ hist.destruction_percentage }}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </UiCard>
      </div>
    </div>

    <!-- Add Clan Modal -->
    <ClientOnly>
      <div v-if="showAddClanModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAddClanModal = false"></div>
        <div class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">Ajouter un clan</h2>
            <button @click="showAddClanModal = false" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <X class="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form @submit.prevent="handleAddClan" class="p-6 space-y-4">
            <UiInput v-model="newClan.name" label="Nom du clan" placeholder="ex: Belgique" required />
            <UiInput v-model="newClan.tag" label="Tag du clan" placeholder="ex: #L2Y8CUP" required />
            <div class="flex gap-3 mt-6">
              <UiButton type="button" variant="outline" block @click="showAddClanModal = false">Annuler</UiButton>
              <UiButton type="submit" variant="primary" block :loading="isAddingClan">Ajouter</UiButton>
            </div>
          </form>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

