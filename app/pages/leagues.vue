<script setup lang="ts">
import { Shield, Users, Trophy, AlertCircle } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

const activeTab = ref('status')

// Mock Data for UI dev
const clanInfo = ref({
  name: 'Les Gaulois',
  tag: '#29UQ9J8Y',
  role: 'Leader', // currentUser Role
  league: 'Master League I',
  cwlStatus: 'active', // 'active', 'signup', 'ended'
  round: 3
})

const roster = ref([
  { id: 1, name: 'Chef Renaud', tag: '#123', th: 16, active: true, stars: 21, destruction: 540 },
  { id: 2, name: 'DarkVador', tag: '#456', th: 16, active: true, stars: 15, destruction: 480 },
  { id: 3, name: 'ObiWan', tag: '#789', th: 15, active: false, stars: 0, destruction: 0 },
  // ... more members
])

// Generate more mock members
for (let i = 4; i <= 30; i++) {
  roster.value.push({
    id: i,
    name: `Member ${i}`,
    tag: `#TAG${i}`,
    th: 13 + Math.floor(Math.random() * 4), // TH 13-16
    active: i <= 15,
    stars: Math.floor(Math.random() * 21),
    destruction: Math.floor(Math.random() * 600)
  })
}

// Stats
const totalStars = computed(() => roster.value.reduce((acc, curr) => acc + curr.stars, 0))
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
        <p class="text-slate-500 dark:text-slate-400 mt-1">Gérez votre roster et suivez les performances</p>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" :icon="Users">Gérer Roster</UiButton>
        <UiButton :icon="Trophy">Voir Groupe</UiButton>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-slate-200 dark:border-slate-700">
      <nav class="-mb-px flex space-x-8">
        <button 
          v-for="tab in ['status', 'roster', 'stats']" 
          :key="tab"
          @click="activeTab = tab"
          class="capitalize py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200"
          :class="activeTab === tab 
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'"
        >
          {{ tab }}
        </button>
      </nav>
    </div>

    <!-- Content: Status Tab -->
    <div v-if="activeTab === 'status'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <UiCard title="État Actuel" class="lg:col-span-2">
        <div class="flex items-center gap-6 mb-8">
          <div class="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-4xl">
            🛡️
          </div>
          <div>
            <h3 class="text-2xl font-bold text-slate-900 dark:text-white">{{ clanInfo.league }}</h3>
            <div class="flex items-center gap-2 mt-2">
              <UiBadge variant="success">En cours</UiBadge>
              <span class="text-slate-500">Round {{ clanInfo.round }} / 7</span>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div class="text-2xl font-bold text-indigo-600">{{ totalStars }}</div>
            <div class="text-sm text-slate-500">Étoiles Totales</div>
          </div>
          <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div class="text-2xl font-bold text-green-600">#2</div>
            <div class="text-sm text-slate-500">Position</div>
          </div>
           <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
            <div class="text-2xl font-bold text-amber-600">15</div>
            <div class="text-sm text-slate-500">Attaques rest.</div>
          </div>
        </div>
      </UiCard>

      <UiCard title="Prochain Match">
        <template #header>
           <UiBadge variant="warning">Dans 4h</UiBadge>
        </template>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="font-medium dark:text-white">Adversaire</span>
            <span class="text-slate-500">Dark Slayers</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-medium dark:text-white">HDV Moy.</span>
            <span class="text-slate-500">15.4</span>
          </div>
           <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-700 dark:text-indigo-300 text-sm flex gap-2">
            <AlertCircle class="w-5 h-5 flex-shrink-0" />
            <p>Pensez à remplir les châteaux de clan avant 20:00 !</p>
          </div>
        </div>
        <template #footer>
          <UiButton block variant="primary">Préparer Stratégie</UiButton>
        </template>
      </UiCard>
    </div>

    <!-- Content: Roster Tab -->
    <UiCard v-if="activeTab === 'roster'" title="Gestion du Roster (15 vs 15)">
      <template #header>
        <div class="text-sm text-slate-500">
          <span class="font-bold text-slate-900 dark:text-white">{{ roster.filter(m => m.active).length }}</span> / 15 Sélectionnés
        </div>
      </template>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-100 dark:border-slate-700 text-slate-500 text-sm">
              <th class="py-3 px-4 font-medium">Joueur</th>
              <th class="py-3 px-4 font-medium">HDV</th>
              <th class="py-3 px-4 font-medium">Statut</th>
              <th class="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
            <tr v-for="member in roster" :key="member.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td class="py-3 px-4">
                <div class="font-medium text-slate-900 dark:text-white">{{ member.name }}</div>
                <div class="text-xs text-slate-400">{{ member.tag }}</div>
              </td>
              <td class="py-3 px-4">
                <span class="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded text-xs font-bold">
                  TH {{ member.th }}
                </span>
              </td>
              <td class="py-3 px-4">
                 <UiBadge :variant="member.active ? 'success' : 'default'">
                    {{ member.active ? 'Titulaire' : 'Réserve' }}
                 </UiBadge>
              </td>
              <td class="py-3 px-4 text-right">
                <button 
                  @click="member.active = !member.active"
                  class="text-sm font-medium hover:underline focus:outline-none"
                  :class="member.active ? 'text-red-600' : 'text-indigo-600'"
                >
                  {{ member.active ? 'Retirer' : 'Ajouter' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>
  </div>
</template>
