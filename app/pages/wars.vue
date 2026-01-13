<script setup lang="ts">
import { Swords, Clock, CheckCircle2, Loader2 } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiAlert from '~/components/ui/Alert.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const trackedClans = ref<any[]>([])
const selectedClanTag = ref('')
const loading = ref(true)
const warData = ref<any>(null)
const cwlData = ref<any>(null)
const pastWars = ref<any[]>([])
const error = ref<string | null>(null)

const fetchTrackedClans = async () => {
  const { data } = await (supabase.from('tracked_clans') as any).select('*')
  if (data) {
    trackedClans.value = data
    if (data.length > 0 && !selectedClanTag.value) {
      selectedClanTag.value = data[0].tag
    }
  }
}

const fetchWarData = async () => {
  if (!selectedClanTag.value) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const encodedTag = encodeURIComponent(selectedClanTag.value)
    
    // 1. Fetch Current War (Standard or CWL War)
    const data = await $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar`)
    warData.value = data.state !== 'notInWar' ? data : null

    // 2. Fetch CWL Group Info
    try {
      const cwl = await $fetch<any>(`/api/coc/clans/${encodedTag}/currentwar/leaguegroup`)
      cwlData.value = cwl
    } catch (e) {
      cwlData.value = null
    }

    // 3. Fetch Past Wars from DB
    const { data: dbWars } = await supabase
      .from('wars')
      .select('*')
      .order('war_date', { ascending: false })
      .limit(10)
    
    pastWars.value = dbWars || []

  } catch (err: any) {
    console.error('Error fetching war data:', err)
    error.value = "Impossible de récupérer les données de guerre. L'API est peut-être indisponible."
    warData.value = null
  } finally {
    loading.value = false
  }
}

const us = computed(() => warData.value?.clan || { name: 'Notre Clan', stars: 0, destructionPercentage: 0, attacks: 0 })
const opponent = computed(() => warData.value?.opponent || { name: 'Adversaire', stars: 0, destructionPercentage: 0, attacks: 0 })
const maxAttacks = computed(() => (warData.value?.teamSize || 0) * (warData.value?.attacksPerMember || 1))

const attacks = computed(() => {
  if (!warData.value?.clan?.members) return []
  const allAttacks: any[] = []
  warData.value.clan.members.forEach((m: any) => {
    if (m.attacks) {
      m.attacks.forEach((a: any) => {
        allAttacks.push({
          id: `${m.tag}-${a.defenderTag}`,
          attacker: m.name,
          defender: `HDV ${a.destructionPercentage}%`,
          stars: a.stars,
          percent: a.destructionPercentage,
          time: 'Terminé',
          status: a.stars === 3 ? 'success' : (a.stars === 2 ? 'warning' : 'danger')
        })
      })
    }
  })
  return allAttacks.sort((a, b) => b.percent - a.percent)
})

const notAttackedYet = computed(() => {
  if (!warData.value?.clan?.members) return []
  return warData.value.clan.members
    .filter((m: any) => !m.attacks || m.attacks.length < (warData.value.attacksPerMember || 1))
    .map((m: any) => ({ name: m.name, th: m.townhallLevel }))
})

const calculateProgress = (val: number, max: number) => max > 0 ? (val / max) * 100 : 0

watch(selectedClanTag, () => {
  fetchWarData()
})

onMounted(async () => {
  await fetchTrackedClans()
  await fetchWarData()
})
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Swords class="w-8 h-8 text-amber-600" />
          Guerre de Clan
        </h1>
        <div v-if="warData" class="flex items-center gap-2 mt-2 text-slate-500">
           <Clock class="w-4 h-4" />
           <span v-if="warData.state === 'inWar'">Se termine : {{ new Date(warData.endTime.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toLocaleString() }}</span>
           <span v-else-if="warData.state === 'preparation'">Démarre bientôt</span>
        </div>
        <!-- CWL Badge -->
        <div v-if="cwlData" class="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold ring-1 ring-indigo-200 dark:ring-indigo-800">
          <Shield class="w-3 h-3" />
          {{ cwlData.season }} - {{ cwlData.state === 'inWar' ? 'Ligue en cours' : 'Préparation Ligue' }}
        </div>
      </div>
      <div class="flex items-center gap-3">
        <select 
          v-model="selectedClanTag"
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option v-for="clan in trackedClans" :key="clan.tag" :value="clan.tag">
            {{ clan.name }}
          </option>
        </select>
        <UiButton :icon="CheckCircle2" variant="primary" @click="fetchWarData">Actualiser</UiButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error">
       <UiAlert variant="destructive" title="Erreur">
         {{ error }}
       </UiAlert>
    </div>

    <!-- No War State -->
    <div v-else-if="!warData" class="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
      <div class="max-w-md mx-auto space-y-4">
        <div class="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Swords class="w-10 h-10 text-slate-400" />
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">Pas de guerre en cours</h2>
        <p class="text-slate-500">Ce clan n'est actuellement pas engagé dans une guerre de clan standard.</p>
        <div class="pt-4">
          <NuxtLink to="/leagues">
            <UiButton variant="outline">Vérifier la Ligue (CWL)</UiButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Scoreboard (With Real Data) -->
    <div v-if="!loading && warData" class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <!-- Us -->
      <div class="text-center space-y-2 relative z-10">
        <h2 class="text-xl font-bold text-blue-600 dark:text-blue-400">{{ us.name }}</h2>
        <div class="text-5xl font-black text-slate-900 dark:text-white">{{ us.stars }} <span class="text-2xl text-amber-500">★</span></div>
        <div class="text-sm font-medium text-slate-500">{{ us.destructionPercentage.toFixed(1) }}% Destruction</div>
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
        <div class="text-sm font-medium text-slate-500">{{ opponent.destructionPercentage.toFixed(1) }}% Destruction</div>
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
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border border-white/20"
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


      </div> <!-- end Sidebar (218) -->
    </div> <!-- end Grid (181) -->
  </div> <!-- end Current War Section (147) -->

  <!-- Past Wars History -->
    <div class="space-y-6">
      <h3 class="text-xl font-bold text-slate-900 dark:text-white">Historique des Guerres</h3>
      <div v-if="pastWars.length === 0" class="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
        Aucun historique de guerre trouvé dans la base de données.
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="war in pastWars" 
          :key="war.id"
          class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between"
        >
          <div class="flex items-center gap-4">
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
              :class="{
                'bg-green-100 text-green-700': war.result === 'victory',
                'bg-red-100 text-red-700': war.result === 'defeat',
                'bg-slate-100 text-slate-700': war.result === 'draw' || !war.result
              }"
            >
              {{ war.result === 'victory' ? 'V' : (war.result === 'defeat' ? 'D' : 'N') }}
            </div>
            <div>
              <div class="font-bold text-slate-900 dark:text-white">vs {{ war.opponent_name }}</div>
              <div class="text-xs text-slate-400">{{ new Date(war.war_date).toLocaleDateString() }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-slate-900 dark:text-white">{{ war.stars_us }} - {{ war.stars_them }}</div>
            <div class="text-xs text-slate-500">{{ war.percentage_us }}% vs {{ war.percentage_them }}%</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
