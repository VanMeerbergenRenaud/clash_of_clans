<script setup lang="ts">
import { Shield, Users, Trophy, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

const activeTab = ref('status')

const trackedClans = [
  { name: 'Belgique', tag: '#L2Y8CUP' },
  { name: 'Belgique 3', tag: '#2PVG8CQCC' }
]

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
  playerStats: PlayerStats[]
  loading: boolean
  loadingStats: boolean
  error: string | null
  showStats: boolean
}

const clansData = ref<Record<string, ClanState>>({})

// Initialize data structure
trackedClans.forEach(c => {
  clansData.value[c.tag] = { 
    info: null, 
    leagueGroup: null, 
    playerStats: [],
    loading: true, 
    loadingStats: false,
    error: null,
    showStats: false
  }
})

const clanViewModels = computed(() => {
  return trackedClans.map(clan => ({
    ...clan,
    state: clansData.value[clan.tag] || { 
      info: null, 
      leagueGroup: null, 
      playerStats: [],
      loading: false, 
      loadingStats: false,
      error: 'Initialization Error',
      showStats: false
    }
  }))
})

const fetchWarDetails = async (clanTag: string) => {
  const state = clansData.value[clanTag]
  if (!state || !state.leagueGroup) return

  state.loadingStats = true
  const playerStatsMap = new Map<string, PlayerStats>()
  
  const config = useRuntimeConfig()
  const baseUrl = config.public.cocProxyUrl || '/api/coc'

  try {
    // Fetch all war details from rounds
    for (const round of state.leagueGroup.rounds) {
      for (const warTag of round.warTags) {
        try {
          const encodedWarTag = encodeURIComponent(warTag)
          const warData = await $fetch<any>(`${baseUrl}/clanwarleagues/wars/${encodedWarTag}`)
          
          // Find our clan in this war
          const ourClan = warData.clan?.tag === clanTag ? warData.clan : 
                         warData.opponent?.tag === clanTag ? warData.opponent : null
          
          if (!ourClan || !ourClan.members) continue

          // Aggregate stats for each player
          for (const member of ourClan.members) {
            const tag = member.tag
            const existing = playerStatsMap.get(tag) || {
              tag,
              name: member.name,
              stars: 0,
              destructionPercentage: 0,
              attacks: 0
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
        } catch (err) {
          console.error(`Error fetching war ${warTag}:`, err)
        }
      }
    }

    // Calculate average destruction percentage
    const playerStats = Array.from(playerStatsMap.values()).map(p => ({
      ...p,
      destructionPercentage: p.attacks > 0 ? p.destructionPercentage / p.attacks : 0
    }))

    // Sort by stars (desc), then by destruction percentage
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
  
  // Fetch stats if we don't have them yet
  if (state.showStats && state.playerStats.length === 0) {
    await fetchWarDetails(clanTag)
  }
}

const fetchData = async () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.cocProxyUrl || '/api/coc'
  
  for (const clan of trackedClans) {
    const encodedTag = encodeURIComponent(clan.tag)
    const state = clansData.value[clan.tag]
    if (!state) continue

    state.loading = true
    
    try {
      // Fetch Clan Info
      const infoData = await $fetch<ClanData>(`${baseUrl}/clans/${encodedTag}`)
      state.info = infoData

      // Fetch League Group
      try {
        const groupData = await $fetch<LeagueGroupData>(`${baseUrl}/clans/${encodedTag}/currentwar/leaguegroup`)
        state.leagueGroup = groupData
      } catch (err: any) {
        if (err.statusCode === 404) {
           // Not in a league
           state.leagueGroup = null
        } else {
           console.error(`Error fetching league group for ${clan.name}:`, err)
        }
      }

    } catch (err: any) {
      console.error(`Error fetching data for ${clan.name}:`, err)
      state.error = err.statusMessage || err.message || "Impossible de récupérer les données"
      // Add status code if available for clarity
      if (err.statusCode) {
         state.error += ` (${err.statusCode})`
      }
    } finally {
      state.loading = false
    }
  }
}

onMounted(() => {
  fetchData()
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
        <p class="text-slate-500 dark:text-slate-400 mt-1">Suivi des clans Belgique & Belgique 3</p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" :icon="Users" @click="fetchData">Actualiser</UiButton>
      </div>
    </div>

    <!-- Content -->
    <div class="grid grid-cols-1 gap-6">
      <div v-for="clan in clanViewModels" :key="clan.tag">
        <UiCard :title="clan.name">
          <template #header>
             <span class="text-sm text-slate-500">{{ clan.tag }}</span>
          </template>

          <div v-if="clan.state.loading" class="flex justify-center py-8">
            <Loader2 class="w-8 h-8 text-indigo-600 animate-spin" />
          </div>

          <div v-else-if="clan.state.error" class="text-red-500 py-4">
            {{ clan.state.error }}
          </div>

          <div v-else class="space-y-6">
            <!-- Basic Info -->
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">
                  {{ clan.state.info?.warLeague?.name || 'Pas de ligue' }}
                </h3>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-slate-500">Niveau {{ clan.state.info?.clanLevel }}</span>
                  <span>•</span>
                  <span class="text-slate-500">{{ clan.state.info?.members }} membres</span>
                </div>
              </div>
            </div>

            <!-- League Group Status -->
            <div v-if="clan.state.leagueGroup" class="space-y-4">
              <div class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
                <h4 class="font-semibold text-indigo-900 dark:text-indigo-200 mb-2">
                  Saison {{ clan.state.leagueGroup?.season }} - {{ clan.state.leagueGroup?.state }}
                </h4>
                <p class="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Clans dans le groupe :
                </p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span v-for="c in clan.state.leagueGroup?.clans" :key="c.tag"
                    class="px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                    {{ c.name }}
                  </span>
                </div>
                
                <!-- Toggle Stats Button -->
                <button 
                  @click="toggleStats(clan.tag)"
                  class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                  <component :is="clan.state.showStats ? ChevronUp : ChevronDown" class="w-4 h-4" />
                  {{ clan.state.showStats ? 'Masquer' : 'Voir' }} les statistiques des joueurs
                </button>
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
                          💥 Destruction Moy.
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
                          {{ index + 1 }}
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
            <div v-else class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center text-slate-500">
              Aucune information de Ligue de Guerre disponible actuellement (Hors saison ou pas inscrit).
            </div>
            
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

