<script setup lang="ts">
import { Users, ChevronUp, ChevronDown } from 'lucide-vue-next'
import type { WarParticipant } from '~/types/war'

const props = defineProps<{
  participants: WarParticipant[]
}>()

// Sorting
type SortColumn = 'mapPosition' | 'attacks' | 'stars' | 'destruction'
const sortColumn = ref<SortColumn>('mapPosition')
const sortDirection = ref<'asc' | 'desc'>('asc')

const toggleSort = (column: SortColumn) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = column === 'mapPosition' ? 'asc' : 'desc'
  }
}

const sortedParticipants = computed(() => {
  if (!props.participants.length) return []
  
  const sorted = [...props.participants].map((m: any) => ({
    ...m,
    attacksCount: m.attacks?.length || 0,
    totalStars: m.attacks ? m.attacks.reduce((sum: number, a: any) => sum + a.stars, 0) : 0,
    // Calculate average destruction for sorting if needed, or use total
    avgDestruction: m.attacks && m.attacks.length > 0 
      ? m.attacks.reduce((sum: number, a: any) => sum + a.destructionPercentage, 0) / m.attacks.length 
      : 0
  }))
  
  sorted.sort((a, b) => {
    let aVal: number, bVal: number
    switch (sortColumn.value) {
      case 'mapPosition':
        aVal = a.mapPosition
        bVal = b.mapPosition
        break
      case 'attacks':
        aVal = a.attacksCount
        bVal = b.attacksCount
        break
      case 'stars':
        aVal = a.totalStars
        bVal = b.totalStars
        break
      case 'destruction':
        aVal = a.avgDestruction
        bVal = b.avgDestruction
        break
      default:
        return 0
    }
    return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
  })
  
  return sorted
})
</script>

<template>
  <div>
       <div class="px-1 flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 text-slate-500">
             <Users class="w-4 h-4" />
             <span class="font-semibold text-sm">Tous les participants</span>
          </div>
          <span class="text-xs font-medium text-slate-400">{{ participants.length }} joueurs</span>
       </div>
       
       <!-- Desktop Table View -->
       <div class="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
             <table class="w-full text-sm">
                <thead>
                   <tr class="bg-slate-50 text-slate-500 text-xs font-medium border-b border-slate-100">
                      <th class="px-4 py-3 text-left w-12">
                         <button @click="toggleSort('mapPosition')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors">
                            #
                            <template v-if="sortColumn === 'mapPosition'">
                               <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                               <ChevronDown v-else class="w-3 h-3" />
                            </template>
                         </button>
                      </th>
                      <th class="px-4 py-3 text-left">Joueur</th>
                      <th class="px-4 py-3 text-center">HDV</th>
                      <th class="px-4 py-3 text-center">
                         <button @click="toggleSort('attacks')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors mx-auto">
                            Attaques
                            <template v-if="sortColumn === 'attacks'">
                               <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                               <ChevronDown v-else class="w-3 h-3" />
                            </template>
                         </button>
                      </th>
                      <th class="px-4 py-3 text-center">
                         <button @click="toggleSort('stars')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors mx-auto">
                            Étoiles
                            <template v-if="sortColumn === 'stars'">
                               <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                               <ChevronDown v-else class="w-3 h-3" />
                            </template>
                         </button>
                      </th>
                      <th class="px-4 py-3 text-right">
                         <button @click="toggleSort('destruction')" class="inline-flex items-center gap-1 hover:text-slate-700 transition-colors ml-auto">
                            Destruction
                            <template v-if="sortColumn === 'destruction'">
                               <ChevronUp v-if="sortDirection === 'asc'" class="w-3 h-3" />
                               <ChevronDown v-else class="w-3 h-3" />
                            </template>
                         </button>
                      </th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                   <tr v-for="member in sortedParticipants" :key="member.tag" class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-4 py-3 text-slate-400 text-xs font-medium">{{ member.mapPosition }}</td>
                      <td class="px-4 py-3">
                         <span class="font-medium text-slate-900">{{ member.name }}</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                         <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">HDV {{ member.townHallLevel }}</span>
                      </td>
                      <td class="px-4 py-3 text-center">
                         <div class="flex justify-center gap-1">
                            <div v-for="i in 2" :key="i" class="w-2 h-2 rounded-full"
                               :class="{
                                 'bg-green-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 3,
                                 'bg-amber-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 2,
                                 'bg-red-400': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars <= 1,
                                 'bg-slate-200': !member.attacks || !member.attacks[i-1]
                               }">
                            </div>
                         </div>
                      </td>
                      <td class="px-4 py-3 text-center">
                         <span class="font-semibold text-slate-700">
                            {{ member.totalStars }}
                            <span class="text-amber-400">★</span>
                         </span>
                      </td>
                      <td class="px-4 py-3 text-right font-medium text-slate-600">
                         {{ member.avgDestruction.toFixed(0) }}%
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>
       </div>

       <!-- Mobile Card View -->
       <div class="md:hidden space-y-3">
          <div v-for="member in sortedParticipants" :key="member.tag" class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
             <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                   <span class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {{ member.mapPosition }}
                   </span>
                   <div>
                      <div class="font-bold text-slate-900 text-sm">{{ member.name }}</div>
                      <div class="text-[10px] text-slate-400 uppercase font-medium">HDV {{ member.townHallLevel }}</div>
                   </div>
                </div>
                <div class="text-right">
                   <div class="flex items-center gap-1 justify-end">
                      <span class="text-lg font-black text-slate-900 leading-none">{{ member.totalStars }}</span>
                      <span class="text-amber-400 text-xs">★</span>
                   </div>
                   <div class="text-xs font-medium text-slate-400">{{ member.avgDestruction.toFixed(0) }}%</div>
                </div>
             </div>
             
             <!-- Attacks -->
             <div class="flex items-center justify-between pt-3 border-t border-slate-50">
                <span class="text-xs font-medium text-slate-400">Attaques</span>
                <div class="flex gap-1.5">
                   <div v-for="i in 2" :key="i" class="w-3 h-3 rounded-full"
                      :class="{
                        'bg-green-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 3,
                        'bg-amber-500': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars === 2,
                        'bg-red-400': member.attacks && member.attacks[i-1] && member.attacks[i-1].stars <= 1,
                        'bg-slate-200': !member.attacks || !member.attacks[i-1]
                      }">
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
</template>
