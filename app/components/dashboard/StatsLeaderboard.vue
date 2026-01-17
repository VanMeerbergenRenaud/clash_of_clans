<script setup lang="ts">
import { ref, computed } from 'vue'
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

const currentLeaderboard = computed(() => {
  return activeTab.value === 'perfect' ? props.perfectLeaderboard : props.oneStarLeaderboard
})

const updateRange = (value: string) => {
  emit('update:filters', { ...props.filters, range: value as LeaderboardFilters['range'] })
}

const updateClan = (value: string) => {
  emit('update:filters', { ...props.filters, clanTag: value })
}

const typeLabel = computed(() => props.type === 'war' ? 'guerres' : 'ligues')

// Dynamic range label
const rangeLabel = computed(() => {
  const opt = rangeOptions.find(o => o.value === props.filters.range)
  return opt?.label || 'Dernière'
})

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
                {{ opt.label }} {{ typeLabel }}
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
    <div class="p-3 min-h-[250px] max-h-[400px] overflow-y-scroll grid items-center">
      <!-- Loading -->
      <div v-if="loading" class="py-8 text-center text-slate-400 text-sm">
        Chargement...
      </div>
      
      <!-- Empty State -->
      <div v-else-if="currentLeaderboard.length === 0" class="py-8 text-center text-slate-400 text-sm">
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
          
          <!-- Player Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-800 truncate">{{ entry.playerName }}</p>
            <p class="text-xs text-slate-400">
              {{ entry.totalStars }} ⭐ · {{ entry.totalAttacks }} attaques
            </p>
          </div>
          
          <!-- Main Stat -->
          <div class="flex-shrink-0 text-right">
            <p 
              class="text-lg font-bold"
              :class="activeTab === 'perfect' ? 'text-emerald-600' : 'text-red-600'"
            >
              {{ activeTab === 'perfect' ? entry.perfectCount : entry.oneStarCount }}
            </p>
            <p class="text-xs text-slate-400">
              {{ activeTab === 'perfect' ? (type === 'war' ? '6★' : '3★') : '1★' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
