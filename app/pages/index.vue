<script setup lang="ts">
import { Shield, Swords, Map, Layers, TrendingUp, Users, ArrowRight, ChevronRight } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiAlert from '~/components/ui/Alert.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const clansInfo = ref<any[]>([])
const loading = ref(true)

const fetchClansData = async () => {
  loading.value = true
  try {
    const { data: clans, error } = await (supabase.from('tracked_clans') as any).select('*')
    if (error) throw error

    const data = await Promise.all(clans.map(async (clan: any) => {
      const encodedTag = encodeURIComponent(clan.tag)
      try {
        const info = await $fetch<any>(`/api/coc/clans/${encodedTag}`)
        return { ...clan, info }
      } catch (e) {
        return { ...clan, info: { name: clan.name, error: true } }
      }
    }))
    clansInfo.value = data
  } catch (err) {
    console.error('Error fetching dashboard clans data:', err)
  } finally {
    loading.value = false
  }
}

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
      { id: 'record-wars', label: 'Guerres' },
      { id: 'record-leagues', label: 'Ligues (CWL)' }
    ]

    systemStatus.value = tasks.map(task => {
      const lastRun = logs?.find((l: any) => l.task_name === task.id)
      const lastDate = lastRun ? new Date(lastRun.created_at) : null
      const isHealthy = lastDate && (new Date().getTime() - lastDate.getTime() < 25 * 60 * 60 * 1000) // 25 hours tolerance

      return {
        task: task.id,
        label: task.label,
        lastRun: lastDate ? lastDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Jamais',
        healthy: !!isHealthy
      }
    })
  } catch (e) {
    console.error('Error checking system status:', e)
  }
}



onMounted(() => {
  fetchClansData()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Welcome Section -->
    <div class="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white overflow-hidden border border-indigo-500/50">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
      <div class="relative z-10">
        <h1 class="text-3xl font-bold mb-2">Tableau de Bord</h1>
        <p class="text-indigo-100 max-w-xl">
          Suivez vos clans, gérez les guerres et préparez vos stratégies.
        </p>
        <div class="flex gap-3 mt-6">
          <NuxtLink to="/wars">
            <button class="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-indigo-50 transition-colors">
              Guerre en cours
            </button>
          </NuxtLink>
          <NuxtLink to="/leagues">
             <button class="bg-indigo-700/50 text-white border border-indigo-400/30 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
              Ligues (CWL)
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stats Grid (Real Data) -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse">
        <div class="w-12 h-12 rounded-full bg-slate-200 mb-3 mx-auto"></div>
        <div class="h-6 bg-slate-200 w-16 mx-auto mb-2"></div>
        <div class="h-4 bg-slate-200 w-24 mx-auto"></div>
      </div>
    </div>

    <div v-else class="space-y-8">
      
      <!-- System Status (New) -->
      <div v-if="systemStatus.length > 0" class="flex gap-4 overflow-x-auto pb-2">
        <div v-for="status in systemStatus" :key="status.task" class="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm min-w-max">
           <div :class="['w-2.5 h-2.5 rounded-full', status.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500']"></div>
           <div>
             <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ status.label }}</div>
             <div class="text-sm font-medium text-slate-900">{{ status.lastRun }}</div>
           </div>
           <div v-if="!status.healthy" class="ml-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Action requise</div>
        </div>
      </div>

      <div v-if="clansInfo.length === 0" class="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
        <div class="max-w-md mx-auto space-y-4">
          <Shield class="w-12 h-12 text-slate-300 mx-auto" />
          <h2 class="text-xl font-bold text-slate-900">Bienvenue sur Clash Manager</h2>
          <p class="text-slate-500">Commencez par ajouter des clans à suivre dans la section Ligues.</p>
          <NuxtLink to="/leagues">
             <UiButton variant="primary" class="mt-4">Aller aux Ligues</UiButton>
          </NuxtLink>
        </div>
      </div>

      <div v-for="clan in clansInfo" :key="clan.tag" class="space-y-4">
        <div class="flex items-center gap-2 px-2">
          <Shield class="w-5 h-5 text-indigo-600" />
          <h2 class="text-xl font-bold text-slate-900">{{ clan.info.name }}</h2>
          <UiBadge variant="default" class="ml-auto text-xs">{{ clan.tag }}</UiBadge>
        </div>
        
        <div v-if="clan.info.error">
          <UiAlert variant="destructive" title="Erreur de chargement">
            Impossible de récupérer les informations pour {{ clan.name }}. Vérifiez le tag du clan ou l'API.
          </UiAlert>
        </div>
        
        <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-green-100 text-green-600">
              <TrendingUp class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900">{{ clan.info.warWins }}</div>
            <div class="text-sm text-slate-500">Victoires</div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-blue-100 text-blue-600">
              <Users class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900">{{ clan.info.members }}/50</div>
            <div class="text-sm text-slate-500">Membres</div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-indigo-100 text-indigo-600">
              <Shield class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900">{{ clan.info.clanLevel }}</div>
            <div class="text-sm text-slate-500">Niveau</div>
          </div>

          <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-amber-100 text-amber-600">
              <Swords class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900">{{ clan.info.warWinStreak }}</div>
            <div class="text-sm text-slate-500">Série</div>
          </div>
        </div>
      </div>
    
      <!-- Quick Actions -->
       <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NuxtLink to="/bases" class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-500 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="bg-emerald-100 p-3 rounded-xl">
                <Map class="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                 <h3 class="font-bold text-slate-900">Trouver une Base</h3>
                 <p class="text-sm text-slate-500">Accéder à la bibliothèque de bases</p>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </NuxtLink>

           <NuxtLink to="/strategies" class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-500 transition-colors group">
            <div class="flex items-center gap-4">
              <div class="bg-purple-100 p-3 rounded-xl">
                <Layers class="w-6 h-6 text-purple-600" />
              </div>
              <div>
                 <h3 class="font-bold text-slate-900">Voir Stratégies</h3>
                 <p class="text-sm text-slate-500">Apprendre de nouvelles attaques</p>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
          </NuxtLink>
        </div>
    </div>
  </div>
</template>
