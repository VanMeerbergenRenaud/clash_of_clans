<script setup lang="ts">
import { Shield, Swords, Map, Layers, TrendingUp, Users, ArrowRight } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

// Mock Stats
const stats = [
  { label: 'Victoires', value: '124', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  { label: 'Membres', value: '48/50', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  { label: 'Niveau Clan', value: '18', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/20' },
  { label: 'Win Streak', value: '5', icon: Swords, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
]

const recentActivity = [
  { id: 1, user: 'Chef Renaud', action: 'a partagé une base TH16', time: 'Il y a 2h', icon: Map },
  { id: 2, user: 'DarkVador', action: 'a ajouté une stratégie', time: 'Il y a 5h', icon: Layers },
  { id: 3, user: 'ObiWan', action: 'a rejoint le clan', time: 'Il y a 1j', icon: Users },
]
</script>

<template>
  <div class="space-y-8">
    <!-- Welcome Section -->
    <div class="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white overflow-hidden shadow-xl">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
      <div class="relative z-10">
        <h1 class="text-3xl font-bold mb-2">Bonjour, Chef ! 👋</h1>
        <p class="text-indigo-100 max-w-xl">
          La Ligue de Clan approche. Vérifiez que tous les membres ont leurs héros disponibles et que les châteaux de clan sont remplis.
        </p>
        <div class="flex gap-3 mt-6">
          <NuxtLink to="/wars">
            <button class="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-50 transition-colors">
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

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="stat in stats" 
        :key="stat.label"
        class="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-transform"
      >
        <div :class="`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${stat.bg} ${stat.color}`">
          <component :is="stat.icon" class="w-6 h-6" />
        </div>
        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ stat.value }}</div>
        <div class="text-sm text-slate-500">{{ stat.label }}</div>
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
              <div class="bg-white dark:bg-slate-700 p-2 rounded-lg shadow-sm">
                <Map class="w-5 h-5 text-emerald-500" />
              </div>
              <span class="font-medium text-slate-700 dark:text-slate-300">Trouver une Base</span>
            </div>
            <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
          </NuxtLink>

           <NuxtLink to="/strategies" class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <div class="flex items-center gap-3">
              <div class="bg-white dark:bg-slate-700 p-2 rounded-lg shadow-sm">
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
