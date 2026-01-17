<script setup lang="ts">
import { Shield, Swords, Users, TrendingUp, Activity, ArrowRight, Star } from 'lucide-vue-next'
import UiButton from '~/components/ui/Button.vue'
import DashboardWarPlanner from '~/components/dashboard/WarPlanner.vue'
import StatsLeaderboard from '~/components/dashboard/StatsLeaderboard.vue'
import { useLeaderboardStats } from '~/composables/useLeaderboardStats'

definePageMeta({
  layout: 'default'
})

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
    // 1. Fetch Tracked Clans
    // Order by 'order' column if exists, otherwise by name. 
    // We'll trust the API returns them or sort locally.
    const { data: clans, error } = await (supabase.from('tracked_clans') as any).select('*').order('created_at', { ascending: true }) // Using created_at as proxy for "order added" if no order col
    if (error) throw error
    
    // Add an index-based order if not present
    // Or if the user meant "Clan Level" order? "Ordered" usually means "My preference".
    // Let's rely on the DB return order (Tracked Clans list).
    clans.forEach((c: any, index: number) => {
        if (!c.order) c.order = index + 1
    })

    // 2. Fetch Clans Info (API) AND Members
    // In a real app we might have members stored in DB or fetch them from API.
    // Let's assume we fetch members from API for each clan.
    
    // Also fetch the Planning Data (DB)
    const { data: planningData, error: planningError } = await (supabase.from('planning_members') as any).select('*')
    if (planningError) {
      console.error('Error fetching planning data:', planningError)
      // Don't throw, just proceed with empty planning to prevent whole dashboard crash
    }
    
    // Create a map of planning data manually by tag
    // Normalize keys: UPPERCASE and remove '#'
    const normalizeTag = (t: string) => t ? t.toUpperCase().replace(/#/g, '').trim() : ''
    
    const planningMap = new Map()
    if (planningData) {
      planningData.forEach((p: any) => {
         if(p.tag) planningMap.set(normalizeTag(p.tag), p)
      })
    }
    
    console.log('DEBUG: Loaded Planning Data entries:', planningMap.size)

    const allfetchedMembers: any[] = []

    const data = await Promise.all(clans.map(async (clan: any) => {
      const encodedTag = encodeURIComponent(clan.tag)
      try {
        const info = await $fetch<any>(`/api/coc/clans/${encodedTag}`)
        
        // Extract members and merge with planning data
        let matchCount = 0
        if (info.memberList) {
           info.memberList.forEach((m: any) => {
              // Normalize lookup
              const lookupKey = normalizeTag(m.tag)
              const pData = planningMap.get(lookupKey)
              
              if (pData) matchCount++
              
              allfetchedMembers.push({
                 id: m.tag, // Keep original tag for ID
                 name: m.name,
                 role: m.role,
                 clanTag: clan.tag,
                 clanName: clan.name,
                 clanOrder: clan.order || 0, // Ensure order exists
                 warPreference: m.warPreference, // API status
                 league: m.league, // Pass league data
                 leagueTier: m.leagueTier, // Pass leagueTier data if available
                 // DB overrides/extensions
                 status: (pData?.cwl_status === 'excluded') ? 'cwl_rotation' 
                         : pData?.war_status === 'excluded' ? 'war_excluded' 
                         : 'available',
                 warNote: pData?.war_note,
                 cwlDay: pData?.cwl_day
              })
           })
        }
        console.log(`DEBUG: Clan ${clan.name} - Matched ${matchCount} planning records`)
        
        return { ...clan, info }
      } catch (e) {
        // Mock data if API fails
        const mockMembers = Array.from({ length: 15 }).map((_, i) => ({
             tag: `#MOCK${clan.tag}${i}`,
             name: `Member ${i} of ${clan.name}`
        }))
        
        mockMembers.forEach((m: any) => {
             const lookupKey = normalizeTag(m.tag)
             const pData = planningMap.get(lookupKey)
             
             allfetchedMembers.push({
                 id: m.tag,
                 name: m.name,
                 role: 'member',
                 clanTag: clan.tag,
                 clanName: clan.name,
                 clanOrder: clan.order || 0,
                 status: (pData?.cwl_status === 'excluded') ? 'cwl_rotation' 
                         : pData?.war_status === 'excluded' ? 'war_excluded' 
                         : 'available',
                 warNote: pData?.war_note,
                 cwlDay: pData?.cwl_day
              })
        })

        return { ...clan, info: { name: clan.name, error: true } }
      }
    }))
    
    clansInfo.value = data
    planningMembers.value = allfetchedMembers

  } catch (err) {
    console.error('Error fetching dashboard data:', err)
  } finally {
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
        title="Stats Guerres"
        :perfect-leaderboard="warStats.perfectLeaderboard.value"
        :one-star-leaderboard="warStats.oneStarLeaderboard.value"
        :filters="warStats.filters.value"
        :clans="warStats.clans.value"
        :loading="warStats.loading.value"
        @update:filters="warStats.filters.value = $event"
      />
      
      <StatsLeaderboard
        type="league"
        title="Stats Ligues"
        :perfect-leaderboard="leagueStats.perfectLeaderboard.value"
        :one-star-leaderboard="leagueStats.oneStarLeaderboard.value"
        :filters="leagueStats.filters.value"
        :clans="leagueStats.clans.value"
        :loading="leagueStats.loading.value"
        @update:filters="leagueStats.filters.value = $event"
      />
    </section>
    
    <!-- War Planning / Organization Widget -->
    <section>
       <DashboardWarPlanner :initialmembers="planningMembers" v-if="!loading" />
       
       <div v-else class="h-[600px] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center text-slate-400">
         Chargement des statistiques...
       </div>
    </section>

  </div>
</template>

