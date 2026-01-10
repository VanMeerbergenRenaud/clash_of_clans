<script setup lang="ts">
import { Layers, Sword, Zap, Wind, PlayCircle, ExternalLink } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

const selectedType = ref('All')

const types = [
  { id: 'All', icon: Layers, label: 'Tout' },
  { id: 'Ground', icon: Sword, label: 'Sol' },
  { id: 'Air', icon: Wind, label: 'Aérien' },
  { id: 'Hybrid', icon: Zap, label: 'Hybride' }
]

// Mock Strategies
const strategies = ref([
  {
    id: 1,
    title: 'Queen Walk Hybrid',
    description: 'La meilleure stratégie pour TH13+. Une P1 Queen Walk solide suivie des mineurs et cochons.',
    type: 'Hybrid',
    th: 13,
    army: '5 Healers, 14 Miners, 11 Hogs...',
    difficulty: 'Hard',
    video: 'https://img.youtube.com/vi/abc12345/maxresdefault.jpg', // Placeholder
    author: 'Chef Renaud'
  },
  {
    id: 2,
    title: 'Zap Lalo',
    description: 'Détruisez les AA et la reine ennemie avec la foudre, puis envoyez les ballons !',
    type: 'Air',
    th: 15,
    army: '3 Hounds, 24 Loons, 8 Minions...',
    difficulty: 'Expert',
    video: 'https://img.youtube.com/vi/xyz98765/maxresdefault.jpg', // Placeholder
    author: 'DarkVador'
  },
  {
    id: 3,
    title: 'Yeti Smash',
    description: 'Une compo sol très robuste pour assurer le 2 étoiles et viser le 3.',
    type: 'Ground',
    th: 16,
    army: '9 Yetis, 8 Bowlers, 4 Healers...',
    difficulty: 'Medium',
    video: 'https://img.youtube.com/vi/123456/maxresdefault.jpg', // Placeholder
    author: 'ObiWan'
  }
])

const filteredStrats = computed(() => {
  if (selectedType.value === 'All') return strategies.value
  return strategies.value.filter(s => s.type === selectedType.value)
})

const difficultyColor = (diff: string) => {
  switch(diff) {
    case 'Easy': return 'success'
    case 'Medium': return 'warning'
    case 'Hard': return 'danger'
    case 'Expert': return 'danger'
    default: return 'default'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers class="w-8 h-8 text-indigo-600" />
          Stratégies d'Attaque
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Apprenez et maîtrisez les meilleures compositions</p>
      </div>

      <UiButton :icon="Plus">Proposer une Stratégie</UiButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 overflow-x-auto pb-2">
      <button 
        v-for="type in types" 
        :key="type.id"
        @click="selectedType = type.id"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 border"
        :class="selectedType === type.id 
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' 
          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'"
      >
        <component :is="type.icon" class="w-4 h-4" />
        {{ type.label }}
      </button>
    </div>

    <!-- Grid -->
    <div class="space-y-4">
      <div 
        v-for="strat in filteredStrats" 
        :key="strat.id"
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 group"
      >
        <!-- Thumbnail -->
        <div class="w-full md:w-64 h-36 bg-slate-900 rounded-xl relative overflow-hidden flex-shrink-0 group-hover:ring-2 ring-indigo-500/50 transition-all">
          <div class="absolute inset-0 flex items-center justify-center text-slate-600">
             <PlayCircle class="w-12 h-12 text-white/80" />
          </div>
          <!-- Placeholder IMG would go here -->
          <div class="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-white text-xs font-bold">10:42</div>
        </div>

        <!-- Content -->
        <div class="flex-1 space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">{{ strat.title }}</h3>
                <UiBadge variant="default" class="text-xs">TH{{ strat.th }}</UiBadge>
              </div>
              <p class="text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{{ strat.description }}</p>
            </div>
            <UiBadge :variant="difficultyColor(strat.difficulty)">{{ strat.difficulty }}</UiBadge>
          </div>

          <div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-mono border border-slate-100 dark:border-slate-700/50">
            {{ strat.army }}
          </div>

          <div class="pt-2 flex items-center justify-between">
            <div class="text-xs text-slate-400">Proposé par {{ strat.author }}</div>
            <div class="flex gap-3">
              <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <ExternalLink class="w-4 h-4" />
                Lien Armée
              </button>
              <button class="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <PlayCircle class="w-4 h-4" />
                Voir Tuto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
