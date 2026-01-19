<script setup lang="ts">
import { Shield, Swords, Users, TrendingUp, Activity, ArrowRight, Star } from 'lucide-vue-next'
import UiButton from '~/components/ui/Button.vue'
import DashboardWarPlanner from '~/components/dashboard/WarPlanner.vue'
import StatsLeaderboard from '~/components/dashboard/StatsLeaderboard.vue'
import { useLeaderboardStats } from '~/composables/useLeaderboardStats'

definePageMeta({
  layout: 'default'
})

const { isViewer, canAccessInscriptions } = useUserRole()

const supabase = useSupabaseClient()
const clansInfo = ref<any[]>([])
// We need a list of ALL members combined from all tracked clans
const planningMembers = ref<any[]>([])
const loading = ref(true)

// -- Leaderboard Stats --
const warStats = useLeaderboardStats('war')
const leagueStats = useLeaderboardStats('league')

// -- Data Fetching --
const fetchData = async () => {
  loading.value = true
  try {
    // 1. Fetch Tracked Clans and Planning Data in parallel
    const [clansRes, planningRes] = await Promise.all([
      (supabase.from('tracked_clans') as any).select('*').order('created_at', { ascending: true }),
      (supabase.from('planning_members') as any).select('*')
    ])

    if (clansRes.error) throw clansRes.error
    const clans = clansRes.data || []
    
    // Create a map of planning data manually by tag
    const normalizeTag = (t: string) => t ? t.toUpperCase().replace(/#/g, '').trim() : ''
    const planningMap = new Map()
    if (planningRes.data) {
      planningRes.data.forEach((p: any) => {
         if(p.tag) planningMap.set(normalizeTag(p.tag), p)
      })
    }

    // Initialize display with empty list but stop global loading
    planningMembers.value = []
    loading.value = false

    // Initialize display
    planningMembers.value = []
    clansInfo.value = []
    loading.value = false

    // 2. Fetch Clans Info (API) AND Members incrementally
    // Use a Map to store members by clan to avoid race conditions when merging
    const clanMembersMap = new Map<string, any[]>()

    clans.forEach((clan: any, index: number) => {
      const clanOrder = clan.ordered ?? (index + 1)
      const encodedTag = encodeURIComponent(clan.tag)
      
      $fetch<any>(`/api/coc/clans/${encodedTag}`, { retry: 0 })
        .then(info => {
          const clanMembers: any[] = []
          if (info.memberList) {
            info.memberList.forEach((m: any) => {
              const lookupKey = normalizeTag(m.tag)
              const pData = planningMap.get(lookupKey)
              
              clanMembers.push({
                id: m.tag,
                name: m.name,
                role: m.role,
                clanTag: clan.tag,
                clanName: clan.name,
                clanOrder: clanOrder,
                warPreference: m.warPreference,
                league: m.league,
                leagueTier: m.leagueTier,
                status: (pData?.cwl_status === 'excluded') ? 'cwl_rotation' 
                        : pData?.war_status === 'excluded' ? 'war_excluded' 
                        : 'available',
                warNote: pData?.war_note,
                cwlDay: pData?.cwl_day
              })
            })
          }
          
          // Store in map using tag as key
          clanMembersMap.set(clan.tag, clanMembers)
          
          // Rebuild the full list from the map (Safe from race conditions)
          planningMembers.value = Array.from(clanMembersMap.values()).flat()
          
          // Add to clans info
          clansInfo.value = [...clansInfo.value, { ...clan, info }]
          
          console.log(`[Dashboard] Loaded ${clan.name}: ${clanMembers.length} members`)
        })
        .catch(err => {
          console.error(`[Dashboard] Error loading clan ${clan.name}:`, err)
        })
    })

  } catch (err) {
    console.error('Error fetching dashboard data:', err)
    loading.value = false
  }
}

// -- System Status Logic --
const systemStatus = ref<any[]>([])
const fetchSystemStatus = async () => {
  try {
    const { data: logs } = await (supabase.from('cron_logs') as any)
      .select('*')
      .in('task_name', ['record-wars', 'record-leagues'])
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(10)

     const tasks = [
      { id: 'record-wars', label: 'Suivi Guerres' },
      { id: 'record-leagues', label: 'Suivi Ligues' }
    ]

    systemStatus.value = tasks.map(task => {
      const lastRun = logs?.find((l: any) => l.task_name === task.id)
      const lastDate = lastRun ? new Date(lastRun.created_at) : null
      const isHealthy = lastDate && (new Date().getTime() - lastDate.getTime() < 25 * 60 * 60 * 1000)

      return {
        task: task.id,
        label: task.label,
        lastRun: lastDate ? lastDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Jamais',
        healthy: !!isHealthy
      }
    })
  } catch(e) { console.error(e) }
}

onMounted(() => {
  fetchData()
  fetchSystemStatus()
  // Initialize leaderboard stats
  warStats.init()
  leagueStats.init()
})

</script>

<template>
  <div class="space-y-8 pb-12">
    
    <!-- Statistics Leaderboards -->
    <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StatsLeaderboard
        type="war"
        title="Stats des guerres"
        :perfect-leaderboard="warStats.perfectLeaderboard.value"
        :one-star-leaderboard="warStats.oneStarLeaderboard.value"
        :filters="warStats.filters.value"
        :clans="warStats.clans.value"
        :loading="warStats.loading.value"
        @update:filters="warStats.filters.value = $event"
      />
      
      <StatsLeaderboard
        type="league"
        title="Stats des ligues"
        :perfect-leaderboard="leagueStats.perfectLeaderboard.value"
        :one-star-leaderboard="leagueStats.oneStarLeaderboard.value"
        :filters="leagueStats.filters.value"
        :clans="leagueStats.clans.value"
        :loading="leagueStats.loading.value"
        @update:filters="leagueStats.filters.value = $event"
      />
    </section>
    
    <!-- War Planning / Organization Widget (visible to everyone) -->
    <section>
       <DashboardWarPlanner :initialmembers="planningMembers" v-if="!loading" />
       
       <div v-else class="h-[600px] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-slate-400">
         Chargement des statistiques...
       </div>
    </section>

  </div>
</template>

