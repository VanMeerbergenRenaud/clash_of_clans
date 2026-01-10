<script setup lang="ts">
import { Map, Filter, Share2, Copy, Download, Star } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

const selectedTH = ref(16)
const selectedType = ref('All')

const thLevels = [16, 15, 14, 13, 12, 11]
const types = ['All', 'War', 'Farming', 'Trophy', 'Fun']

// Mock Bases
const bases = ref([
  {
    id: 1,
    title: 'Anti-Edrag War Base',
    th: 16,
    type: 'War',
    author: 'Chef Renaud',
    stars: 4.8,
    image: 'https://i.pinimg.com/736x/87/40/e3/8740e3428d02187b4156942738743126.jpg', // Placeholder
    link: 'https://link.clashofclans.com/...'
  },
  {
    id: 2,
    title: 'Legend League Defense',
    th: 16,
    type: 'Trophy',
    author: 'DarkVador',
    stars: 4.5,
    image: 'https://i.ytimg.com/vi/aZ3tq_S8WjY/maxresdefault.jpg', // Placeholder
    link: 'https://link.clashofclans.com/...'
  },
   {
    id: 3,
    title: 'CWL Anti-3 Star',
    th: 15,
    type: 'War',
    author: 'ObiWan',
    stars: 4.2,
    image: 'https://i.pinimg.com/originals/c9/2b/9b/c92b9b657440026e632734268393527a.jpg', // Placeholder
    link: 'https://link.clashofclans.com/...'
  },
   {
    id: 4,
    title: 'Hybrid Farm/War',
    th: 16,
    type: 'Farming',
    author: 'Yoda',
    stars: 3.9,
    image: 'https://clashofclans-layouts.com/images/layouts/16/16_13.jpg', // Placeholder
    link: 'https://link.clashofclans.com/...'
  },
])

const filteredBases = computed(() => {
  return bases.value.filter(base => {
    const matchTH = base.th === selectedTH.value
    const matchType = selectedType.value === 'All' || base.type === selectedType.value
    return matchTH && matchType
  })
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header & Controls -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Map class="w-8 h-8 text-emerald-600" />
          Base Layouts
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Trouvez et partagez les meilleures défenses</p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-4">
        <!-- TH Selector -->
        <div class="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
          <button 
            v-for="th in thLevels" 
            :key="th"
            @click="selectedTH = th"
            class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
            :class="selectedTH === th ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
          >
            TH{{ th }}
          </button>
        </div>

        <UiButton :icon="Share2">Partager ma base</UiButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2">
      <button 
        v-for="type in types" 
        :key="type"
        @click="selectedType = type"
        class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border"
        :class="selectedType === type 
          ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white' 
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'"
      >
        {{ type }}
      </button>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="base in filteredBases" 
        :key="base.id"
        class="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <!-- Image Preview -->
        <div class="aspect-[16/9] bg-slate-100 dark:bg-slate-900 relative overflow-hidden">
          <img :src="base.image" alt="Base preview" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute top-3 left-3">
            <span class="bg-black/50 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded">TH {{ base.th }}</span>
          </div>
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
             <UiButton size="sm" variant="secondary" :icon="Copy">Copier Lien</UiButton>
          </div>
        </div>

        <!-- Content -->
        <div class="p-5">
          <div class="flex justify-between items-start mb-2">
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white line-clamp-1">{{ base.title }}</h3>
              <p class="text-xs text-slate-500">par {{ base.author }}</p>
            </div>
            <UiBadge variant="info">{{ base.type }}</UiBadge>
          </div>
          
          <div class="flex items-center justify-between mt-4">
             <div class="flex items-center gap-1 text-amber-500 font-bold text-sm">
               <Star class="w-4 h-4 fill-current" />
               <span>{{ base.stars }}</span>
             </div>
             
             <a :href="base.link" target="_blank" class="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline flex items-center gap-1">
               Ouvrir dans CoC
               <RedirectIcon class="w-3 h-3" />
             </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
