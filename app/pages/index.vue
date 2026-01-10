<script setup lang="ts">
import { Shield, Swords, Map, Layers, TrendingUp, Users, ArrowRight, ChevronRight } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

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

const recentActivity = [
  { id: 1, user: 'Chef Renaud', action: 'a partagé une base TH16', time: 'Il y a 2h', icon: Map },
  { id: 2, user: 'DarkVador', action: 'a ajouté une stratégie', time: 'Il y a 5h', icon: Layers },
  { id: 3, user: 'ObiWan', action: 'a rejoint le clan', time: 'Il y a 1j', icon: Users },
]

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
        <h1 class="text-3xl font-bold mb-2">Bonjour, Chef ! 👋</h1>
        <p class="text-indigo-100 max-w-xl">
          La Ligue de Clan approche. Vérifiez que tous les membres ont leurs héros disponibles et que les châteaux de clan sont remplis.
        </p>
        <div class="flex gap-3 mt-6">
          <NuxtLink to="/wars">
            <button class="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold border border-slate-200 hover:bg-indigo-50 transition-colors">
              Gérer la Guerre
            </button>
          </NuxtLink>
          <NuxtLink to="/leagues">
             <button class="bg-indigo-700/50 text-white border border-indigo-400/30 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
              Voir Roster CWL
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Stats Grid (Real Data) -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse">
        <div class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 mb-3 mx-auto"></div>
        <div class="h-6 bg-slate-200 dark:bg-slate-700 w-16 mx-auto mb-2"></div>
        <div class="h-4 bg-slate-200 dark:bg-slate-700 w-24 mx-auto"></div>
      </div>
    </div>

    <div v-else class="space-y-8">
      <div v-if="clansInfo.length === 0" class="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
        <div class="max-w-md mx-auto space-y-4">
          <Shield class="w-12 h-12 text-slate-300 mx-auto" />
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">Bienvenue sur Clash Manager</h2>
          <p class="text-slate-500">Commencez par ajouter des clans à suivre dans la section Ligues.</p>
          <NuxtLink to="/leagues">
             <UiButton variant="primary" class="mt-4">Aller aux Ligues</UiButton>
          </NuxtLink>
        </div>
      </div>

      <div v-for="clan in clansInfo" :key="clan.tag" class="space-y-4">
        <div class="flex items-center gap-2 px-2">
          <Shield class="w-5 h-5 text-indigo-600" />
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ clan.info.name }}</h2>
          <UiBadge variant="default" class="ml-auto text-xs">{{ clan.tag }}</UiBadge>
        </div>
        
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Victoires -->
          <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-green-100 dark:bg-green-900/20 text-green-600">
              <TrendingUp class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ clan.info.warWins }}</div>
            <div class="text-sm text-slate-500">Victoires</div>
          </div>

          <!-- Membres -->
          <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-blue-100 dark:bg-blue-900/20 text-blue-600">
              <Users class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ clan.info.members }}/50</div>
            <div class="text-sm text-slate-500">Membres</div>
          </div>

          <!-- Niveau -->
          <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600">
              <Shield class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ clan.info.clanLevel }}</div>
            <div class="text-sm text-slate-500">Niveau</div>
          </div>

          <!-- Win Streak -->
          <div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform">
            <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-amber-100 dark:bg-amber-900/20 text-amber-600">
              <Swords class="w-6 h-6" />
            </div>
            <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ clan.info.warWinStreak }}</div>
            <div class="text-sm text-slate-500">Série</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Recent Activity -->
      <UiCard title="Activité Récente" class="lg:col-span-2">
        <div class="space-y-4">
          <div 
            v-for="item in recentActivity" 
            :key="item.id" 
            class="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <component :is="item.icon" class="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-slate-900 dark:text-white">
                <span class="font-bold">{{ item.user }}</span> {{ item.action }}
              </p>
              <p class="text-xs text-slate-400 mt-0.5">{{ item.time }}</p>
            </div>
          </div>
        </div>
        <template #footer>
          <button class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center">
            Voir tout l'historique
          </button>
        </template>
      </UiCard>

      <!-- Quick Actions -->
      <UiCard title="Accès Rapide">
        <div class="space-y-3">
          <NuxtLink to="/bases" class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <div class="flex items-center gap-3">
              <div class="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                <Map class="w-5 h-5 text-emerald-500" />
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Trouver une Base</span>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
          </NuxtLink>

           <NuxtLink to="/strategies" class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <div class="flex items-center gap-3">
              <div class="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                <Layers class="w-5 h-5 text-purple-500" />
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Voir Stratégies</span>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
          </NuxtLink>
        </div>
      </UiCard>
    </div>
  </div>
</template>
