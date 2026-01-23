<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Trophy, AlertTriangle, Star, ChevronDown } from 'lucide-vue-next'
import { type LeaderboardEntry, type LeaderboardFilters, rangeOptions } from '~/composables/useLeaderboardStats'

const props = defineProps<{
  type: 'war' | 'league'
  title: string
  perfectLeaderboard: LeaderboardEntry[]
  oneStarLeaderboard: LeaderboardEntry[]
  filters: LeaderboardFilters
  clans: { tag: string; name: string }[]
  loading: boolean
}>()

const emit = defineEmits<{
  'update:filters': [filters: LeaderboardFilters]
}>()

const activeTab = ref<'perfect' | 'oneStar'>('perfect')

// Eager loading state
const ITEMS_PER_LOAD = 10
const displayCount = ref(ITEMS_PER_LOAD)
const loadTriggerRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const fullLeaderboard = computed(() => {
  return activeTab.value === 'perfect' ? props.perfectLeaderboard : props.oneStarLeaderboard
})

// Displayed items (eager loaded)
const currentLeaderboard = computed(() => {
  return fullLeaderboard.value.slice(0, displayCount.value)
})

const hasMore = computed(() => displayCount.value < fullLeaderboard.value.length)

// Load more items
const loadMore = () => {
  if (hasMore.value) {
    displayCount.value = Math.min(displayCount.value + ITEMS_PER_LOAD, fullLeaderboard.value.length)
  }
}

// Reset display count when tab or filters change
watch([activeTab, () => props.filters], () => {
  displayCount.value = ITEMS_PER_LOAD
})

// Setup IntersectionObserver for eager loading
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !props.loading) {
        loadMore()
      }
    },
    { rootMargin: '100px' }
  )
  
  if (loadTriggerRef.value) {
    observer.observe(loadTriggerRef.value)
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Re-observe when ref changes
watch(loadTriggerRef, (el) => {
  if (observer && el) {
    observer.observe(el)
  }
})

const updateRange = (value: string) => {
  emit('update:filters', { ...props.filters, range: value as LeaderboardFilters['range'] })
}

const updateClan = (value: string) => {
  emit('update:filters', { ...props.filters, clanTag: value })
}

const getUnitLabel = (range: string) => {
  const isSingular = range === 'last1'
  if (props.type === 'war') return isSingular ? 'guerre' : 'guerres'
  return isSingular ? 'ligue' : 'ligues'
}

// Rank styling
const getRankClass = (rank: number) => {
  if (rank === 1) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (rank === 2) return 'bg-slate-100 text-slate-600 border-slate-200'
  if (rank === 3) return 'bg-orange-100 text-orange-700 border-orange-200'
  return 'bg-slate-50 text-slate-500 border-slate-100'
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-slate-100 bg-slate-50">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <h3 class="font-bold text-slate-700 flex items-center gap-2 flex-shrink-0">
          <Trophy v-if="type === 'war'" class="w-4 h-4 text-amber-500" />
          <Star v-else class="w-4 h-4 text-indigo-500" />
          {{ title }}
        </h3>
        
        <!-- Filters -->
        <div class="flex flex-wrap gap-2 sm:ml-auto">
          <!-- Range Filter -->
          <div class="relative">
            <select
              :value="filters.range"
              @change="updateRange(($event.target as HTMLSelectElement).value)"
              class="appearance-none text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-7 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option v-for="opt in rangeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }} {{ getUnitLabel(opt.value) }}
              </option>
            </select>
            <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
          
          <!-- Clan Filter -->
          <div class="relative">
            <select
              :value="filters.clanTag"
              @change="updateClan(($event.target as HTMLSelectElement).value)"
              class="appearance-none text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-7 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="all">Tous les clans</option>
              <option v-for="clan in clans" :key="clan.tag" :value="clan.tag">
                {{ clan.name }}
              </option>
            </select>
            <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
      
      <!-- Tabs -->
      <div class="flex gap-1 mt-3">
        <button
          @click="activeTab = 'perfect'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          :class="activeTab === 'perfect' 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'text-slate-500 hover:bg-slate-100'"
        >
          <span class="flex items-center gap-1">
            <Trophy class="w-3 h-3" />
            Perfecteur
          </span>
        </button>
        <button
          @click="activeTab = 'oneStar'"
          class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          :class="activeTab === 'oneStar' 
            ? 'bg-red-100 text-red-700' 
            : 'text-slate-500 hover:bg-slate-100'"
        >
          <span class="flex items-center gap-1">
            <AlertTriangle class="w-3 h-3" />
            One star
          </span>
        </button>
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-3 min-h-[250px] max-h-[400px] overflow-y-auto grid items-start">
      <!-- Loading -->
      <div v-if="loading" class="py-8 text-center text-slate-400 text-sm">
        Chargement...
      </div>
      
      <!-- Empty State -->
      <div v-else-if="fullLeaderboard.length === 0" class="py-8 text-center text-slate-400 text-sm">
        Aucune donnée disponible
      </div>
      
      <!-- Leaderboard -->
      <div v-else class="space-y-2">
        <div
          v-for="entry in currentLeaderboard"
          :key="entry.playerTag"
          class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <!-- Rank Badge -->
          <div 
            class="w-7 h-7 flex items-center justify-center rounded-lg border text-xs font-bold flex-shrink-0"
            :class="getRankClass(entry.rank)"
          >
            {{ entry.rank }}
          </div>
          
          <!-- Player Info & Stats Container -->
          <div class="flex flex-1 items-center lg:grid lg:grid-cols-[1fr,6.5rem,10rem] gap-4 min-w-4 overflow-hidden">
            <!-- Name -->
            <p class="text-sm font-medium text-slate-800 min-w-[6.5rem] truncate">
              {{ entry.playerName }}
            </p>
            
            <!-- Global Stats (Stars & Attacks) -->
            <div class="flex items-center gap-1 text-sm text-slate-500 whitespace-nowrap">
              <span class="flex items-center">
                {{ entry.totalStars }} <span class="inline ml-1">⭐</span>
              </span>
              <span class="flex items-center">
                <span class="mx-1">·</span> {{ entry.totalAttacks }} <span class="inline ml-1">⚔️</span>
              </span>
            </div>

            <!-- Star Breakdown Badges -->
            <div class="hidden lg:grid grid-cols-3 gap-1.5 min-w-40">
              <span 
                v-if="entry.perfectCount > 0"
                class="col-start-1 px-1.5 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-700 w-fit justify-self-center"
              >
                {{ entry.perfectCount }}×3★
              </span>
              <span 
                v-if="entry.twoStarCount > 0"
                class="col-start-2 px-1.5 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700 w-fit justify-self-center"
              >
                {{ entry.twoStarCount }}×2★
              </span>
              <span 
                v-if="entry.oneStarCount > 0"
                class="col-start-3 px-1.5 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-600 w-fit justify-self-center"
              >
                {{ entry.oneStarCount }}×≤1★
              </span>
            </div>
          </div>
          
          <!-- Main Stat -->
          <div class="flex-shrink-0 text-right min-w-6 lg:min-w-10 px-1">
            <template v-if="activeTab === 'perfect'">
              <p class="text-lg font-semibold text-emerald-600 leading-none">
                {{ entry.perfectCount }}
              </p>
            </template>
            <template v-else>
              <div class="flex items-center gap-2 justify-end">
                <span v-if="entry.zeroStarCount > 0" class="text-[10px] font-medium text-red-500 whitespace-nowrap hidden sm:inline">{{ entry.zeroStarCount }}×0★</span>
                <p class="text-lg font-semibold text-red-600 leading-none">
                  {{ entry.oneStarCount }}
                </p>
              </div>
            </template>
          </div>
        </div>
        
        <!-- Load More Trigger (for IntersectionObserver) -->
        <div 
          v-if="hasMore"
          ref="loadTriggerRef"
          class="py-2 text-center text-xs text-slate-400"
        >
          Chargement...
        </div>
        
        <!-- End of list indicator -->
        <div 
          v-else-if="fullLeaderboard.length > ITEMS_PER_LOAD"
          class="py-2 text-center text-xs text-slate-300"
        >
          {{ fullLeaderboard.length }} joueurs affichés
        </div>
      </div>
    </div>
  </div>
</template>
