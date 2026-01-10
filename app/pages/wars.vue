<script setup lang="ts">
import { Swords, Star, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'

definePageMeta({
  layout: 'default'
})

// Mock War Data
const warStatus = ref('active') // 'active', 'preparation', 'ended'
const opponent = ref({
  name: 'Dark Slayers',
  tag: '#9LV8Q98',
  stars: 42,
  destruction: 89.5,
  attacks: 18,
  level: 14
})

const us = ref({
  name: 'Les Gaulois',
  stars: 45,
  destruction: 92.1,
  attacks: 19
})

const maxAttacks = 30 // 15v15 * 2

// Mock Attacks
const attacks = ref([
  { id: 1, attacker: 'Chef Renaud', defender: 'Enemy #1 (TH16)', stars: 3, percent: 100, time: '2m 12s', status: 'success' },
  { id: 2, attacker: 'DarkVador', defender: 'Enemy #2 (TH16)', stars: 2, percent: 85, time: '5m left', status: 'warning' },
  { id: 3, attacker: 'ObiWan', defender: 'Enemy #3 (TH15)', stars: 1, percent: 66, time: '1h ago', status: 'danger' },
  { id: 4, attacker: 'Yoda', defender: 'Enemy #4 (TH15)', stars: 3, percent: 100, time: '2h ago', status: 'success' },
])

const notAttackedYet = ref([
  { name: 'Member 5', th: 14 },
  { name: 'Member 6', th: 13 },
])

const calculateProgress = (val: number, max: number) => (val / max) * 100
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Swords class="w-8 h-8 text-amber-600" />
          Guerre en Cours
        </h1>
        <div class="flex items-center gap-2 mt-2 text-slate-500">
           <Clock class="w-4 h-4" />
           <span>Se termine dans 4h 12m</span>
        </div>
      </div>
      <UiButton :icon="CheckCircle2" variant="primary">Enregistrer Attaque</UiButton>
    </div>

    <!-- Scoreboard -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <!-- Us -->
      <div class="text-center space-y-2 relative z-10">
        <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">Nous</h2>
        <div class="text-5xl font-black text-slate-900 dark:text-white">{{ us.stars }} <span class="text-2xl text-amber-500">★</span></div>
        <div class="text-sm font-medium text-slate-500">{{ us.destruction }}% Destruction</div>
        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
          <div class="h-full bg-blue-500" :style="{ width: `${calculateProgress(us.attacks, maxAttacks)}%` }"></div>
        </div>
        <div class="text-xs text-slate-400 mt-1">{{ us.attacks }}/{{ maxAttacks }} attaquent</div>
      </div>

      <!-- VS -->
      <div class="text-center relative z-10">
        <div class="text-4xl font-black text-slate-300 dark:text-slate-600">VS</div>
      </div>

      <!-- Opponent -->
      <div class="text-center space-y-2 relative z-10">
        <h2 class="text-xl font-bold text-red-600 dark:text-red-400">{{ opponent.name }}</h2>
        <div class="text-5xl font-black text-slate-900 dark:text-white">{{ opponent.stars }} <span class="text-2xl text-amber-500">★</span></div>
        <div class="text-sm font-medium text-slate-500">{{ opponent.destruction }}% Destruction</div>
        <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
          <div class="h-full bg-red-500" :style="{ width: `${calculateProgress(opponent.attacks, maxAttacks)}%` }"></div>
        </div>
        <div class="text-xs text-slate-400 mt-1">{{ opponent.attacks }}/{{ maxAttacks }} attaquent</div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Attack Log -->
      <div class="lg:col-span-2 space-y-6">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white">Dernières Attaques</h3>
        <div class="space-y-3">
          <div 
            v-for="attack in attacks" 
            :key="attack.id"
            class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-4">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                :class="{
                  'bg-green-500': attack.stars === 3,
                  'bg-amber-500': attack.stars === 2,
                  'bg-red-500': attack.stars <= 1
                }"
              >
                {{ attack.stars }}
              </div>
              <div>
                <div class="font-bold text-slate-900 dark:text-white">{{ attack.attacker }}</div>
                <div class="text-sm text-slate-500 flex items-center gap-1">
                   vs {{ attack.defender }} • <span :class="{'text-green-600': attack.percent === 100}">{{ attack.percent }}%</span>
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <div class="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">{{ attack.time }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar Info -->
      <div class="space-y-6">
        <UiCard title="Restants (2)">
           <div class="divide-y divide-slate-100 dark:divide-slate-700">
             <div v-for="member in notAttackedYet" :key="member.name" class="py-3 flex items-center justify-between">
               <div>
                  <div class="font-medium text-slate-900 dark:text-white">{{ member.name }}</div>
                  <div class="text-xs text-slate-500">HDV {{ member.th }}</div>
               </div>
               <UiButton size="sm" variant="outline">Rappel</UiButton>
             </div>
           </div>
        </UiCard>

        <UiCard title="Performance Stats">
          <div class="space-y-4">
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-slate-500">Taux de Perf (3 étoiles)</span>
                <span class="font-bold text-indigo-600">35%</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500" style="width: 35%"></div>
              </div>
            </div>
            
            <div>
              <div class="flex justify-between text-sm mb-1">
                <span class="text-slate-500">Moyenne étoiles</span>
                <span class="font-bold text-indigo-600">2.4</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div class="h-full bg-purple-500" style="width: 80%"></div>
              </div>
            </div>
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>
