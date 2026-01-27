<script setup lang="ts">
import { Shield, Star as StarIcon, Trophy, AlertCircle, CheckCircle } from 'lucide-vue-next'
import type { WarParticipant } from '~/types/war'

const props = defineProps<{
  stats: {
    pending: WarParticipant[],
    bestDefenses: WarParticipant[],
    perfect: WarParticipant[],
    struggling: WarParticipant[]
  }
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               
    <!-- 6 Stars Card -->
    <div class="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between border-b border-amber-200/50">
            <div class="flex items-center gap-2 text-amber-600">
                <StarIcon class="w-4 h-4" />
                <span class="font-semibold text-sm">6 Étoiles (Perfects)</span>
            </div>
            <span class="text-sm font-bold text-amber-600">{{ stats.perfect.length }}</span>
        </div>
        <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar min-h-[250px]">
            <div v-if="stats.perfect.length > 0">
                <div v-for="m in stats.perfect" :key="m.tag" class="flex items-center justify-between py-2 border-b border-amber-200/20 last:border-0">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-medium text-slate-400 w-6">{{ m.mapPosition }}</span>
                        <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                    </div>
                    <span class="text-xs font-semibold text-amber-500 bg-amber-100 px-2 py-0.5 rounded">6★</span>
                </div>
            </div>
            <div v-else class="py-6 text-center text-slate-400 text-xs">
                Pas encore de 6 étoiles
            </div>
        </div>
    </div>

    <!-- Missing Attacks Card -->
    <div class="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between border-b border-red-200/50">
            <div class="flex items-center gap-2 text-red-500">
                <Shield class="w-4 h-4" />
                <span class="font-semibold text-sm">Attaques Manquantes</span>
            </div>
            <span class="text-sm font-bold text-red-500">{{ stats.pending.length }}</span>
        </div>
        <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar min-h-[250px]">
            <div v-if="stats.pending.length > 0">
                <div v-for="m in stats.pending" :key="m.tag" class="flex items-center justify-between py-2 border-b border-red-200/20 last:border-0">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-medium text-slate-400 w-6">{{ m.mapPosition }}</span>
                        <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                    </div>
                    <span class="text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded">{{ 2 - (m.attacks ? m.attacks.length : 0) }}</span>
                </div>
            </div>
            <div v-else class="py-6 text-center text-green-600 text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle class="w-4 h-4" />
                Tout le monde a attaqué
            </div>
        </div>
    </div>

    <!-- Best Defenses Card -->
    <div class="rounded-xl border border-indigo-200 bg-indigo-50/50 overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between border-b border-indigo-200/50">
            <div class="flex items-center gap-2 text-indigo-600">
                <Shield class="w-4 h-4" />
                <span class="font-semibold text-sm">Meilleures défenses</span>
            </div>
            <span class="text-xs font-medium text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full" v-if="stats.bestDefenses.length > 0">Top {{ stats.bestDefenses.length }}</span>
        </div>
        <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar min-h-[250px]">
            <div v-if="stats.bestDefenses.length > 0">
                <div v-for="m in stats.bestDefenses" :key="m.tag" class="flex items-center justify-between py-2 border-b border-indigo-200/20 last:border-0">
                    <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                    <div class="flex items-center gap-2" v-if="m.bestOpponentAttack">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded"
                                :class="m.bestOpponentAttack.stars === 0 ? 'text-indigo-600 bg-indigo-100' : (m.bestOpponentAttack.stars === 1 ? 'text-indigo-500 bg-indigo-100' : 'text-slate-500 bg-slate-200/50')">
                            {{ m.bestOpponentAttack.stars }}★
                        </span>
                        <span class="text-xs font-medium text-slate-500">{{ m.bestOpponentAttack.destructionPercentage.toFixed(0) }}%</span>
                    </div>
                </div>
            </div>
            <div v-else class="py-6 text-center text-slate-400 text-xs">
                Aucune défense notable
            </div>
        </div>
    </div>

    <!-- Struggling Card -->
    <div class="rounded-xl border border-orange-200 bg-orange-50/50 overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between border-b border-orange-200/50">
            <div class="flex items-center gap-2 text-orange-500">
                <AlertCircle class="w-4 h-4" />
                <span class="font-semibold text-sm">En Difficulté (≤1 étoile)</span>
            </div>
            <span class="text-sm font-bold text-orange-500">{{ stats.struggling.length }}</span>
        </div>
        <div class="px-4 py-2 space-y-1 max-h-48 overflow-y-auto custom-scrollbar min-h-[250px]">
            <div v-if="stats.struggling.length > 0">
                <div v-for="m in stats.struggling" :key="m.tag" class="flex items-center justify-between py-2 border-b border-orange-200/20 last:border-0">
                    <span class="font-medium text-slate-700 text-sm">{{ m.name }}</span>
                    <div class="flex items-center gap-2" v-if="m.attacks">
                        <template v-for="atk in m.attacks.filter((a: any) => a.stars <= 1)" :key="atk.order">
                            <span class="text-xs font-semibold text-orange-500 bg-orange-100 px-2 py-0.5 rounded">
                                {{ atk.stars }}★
                            </span>
                            <span class="text-xs font-medium text-slate-500">{{ atk.destructionPercentage }}%</span>
                        </template>
                    </div>
                </div>
            </div>
            <div v-else class="py-6 text-center text-slate-400 text-xs">
                Aucun échec pour le moment
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
</style>
