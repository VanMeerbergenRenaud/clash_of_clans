<script setup lang="ts">
import { Layers, Sword, Zap, Wind, PlayCircle, ExternalLink, Plus, X, Loader2, Trash2 } from 'lucide-vue-next'
import UiCard from '~/components/ui/Card.vue'
import UiButton from '~/components/ui/Button.vue'
import UiBadge from '~/components/ui/Badge.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'

definePageMeta({
  layout: 'default'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const profile = ref<any>(null)
const strategies = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isAdding = ref(false)
const showAddModal = ref(false)
const selectedType = ref('All')

const newStrat = ref({
  title: '',
  description: '',
  type: 'ground',
  min_town_hall: 16,
  army_link: '',
  video_url: ''
})

const types = [
  { id: 'All', icon: Layers, label: 'Tout' },
  { id: 'ground', icon: Sword, label: 'Sol' },
  { id: 'air', icon: Wind, label: 'Aérien' },
  { id: 'hybrid', icon: Zap, label: 'Hybride' }
]

const fetchProfile = async () => {
  if (!user.value?.id) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  profile.value = data
}

const fetchStrategies = async () => {
  loading.value = true
  error.value = null
  try {
    const { data, error: err } = await supabase
      .from('strategies')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (err) throw err
    strategies.value = data || []
  } catch (err: any) {
    console.error('Error fetching strategies:', err)
    error.value = err.message
  } finally {
     loading.value = false
  }
}

const isAdmin = computed(() => profile.value?.user_type === 'admin')

onMounted(async () => {
  await fetchProfile()
  await fetchStrategies()
})

const handleAddStrategy = async () => {
  isAdding.value = true
  const { error } = await (supabase.from('strategies') as any).insert([newStrat.value])
  if (!error) {
    await fetchStrategies()
    showAddModal.value = false
    newStrat.value = { title: '', description: '', type: 'ground', min_town_hall: 16, army_link: '', video_url: '' }
  } else {
    alert(error.message)
  }
  isAdding.value = false
}

const handleDeleteStrategy = async (id: string) => {
  if (!confirm('Supprimer cette stratégie ?')) return
  const { error } = await supabase.from('strategies').delete().eq('id', id)
  if (!error) {
    await fetchStrategies()
  } else {
    alert(error.message)
  }
}

const filteredStrats = computed(() => {
  if (selectedType.value === 'All') return strategies.value
  return strategies.value.filter(s => s.type === selectedType.value)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Layers class="w-8 h-8 text-indigo-600" />
          Stratégies d'Attaque
        </h1>
        <p class="text-slate-500 mt-1">Apprenez et maîtrisez les meilleures compositions</p>
      </div>

      <UiButton @click="showAddModal = true" :icon="Plus">Proposer une Stratégie</UiButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 overflow-x-auto pb-2">
      <button 
        v-for="type in types" 
        :key="type.id"
        @click="selectedType = type.id"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 border"
        :class="selectedType === type.id 
          ? 'bg-indigo-600 text-white border-indigo-600' 
          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'"
      >
        <component :is="type.icon" class="w-4 h-4" />
        {{ type.label }}
      </button>
    </div>

    <!-- Content -->
    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="w-10 h-10 text-indigo-600 animate-spin" />
    </div>

    <div v-else-if="error">
       <UiAlert variant="destructive" title="Erreur">
         {{ error }}
       </UiAlert>
    </div>

    <div v-else-if="filteredStrats.length === 0" class="text-center py-20 bg-white rounded-3xl border border-slate-200">
      <p class="text-slate-500">Aucune stratégie trouvée.</p>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="strat in filteredStrats" 
        :key="strat.id"
        class="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-300 transition-colors flex flex-col md:flex-row gap-6 group"
      >
        <!-- Thumbnail -->
        <div class="w-full md:w-64 h-36 bg-slate-900 rounded-xl relative overflow-hidden flex-shrink-0 group-hover:ring-2 ring-indigo-500/50 transition-all">
          <div class="absolute inset-0 flex items-center justify-center text-slate-600">
             <PlayCircle class="w-12 h-12 text-white/80" />
          </div>
          <div v-if="strat.video_url" class="absolute inset-0">
             <img :src="`https://img.youtube.com/vi/${strat.video_url.split('v=')[1]?.split('&')[0]}/maxresdefault.jpg`" class="w-full h-full object-cover opacity-60" />
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 space-y-3">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-xl font-bold text-slate-900">{{ strat.title }}</h3>
                <UiBadge variant="default" class="text-xs">TH{{ strat.min_town_hall }}</UiBadge>
                <UiBadge variant="info" class="text-xs capitalize">{{ strat.type }}</UiBadge>
              </div>
              <p class="text-slate-500 mt-1 line-clamp-2">{{ strat.description }}</p>
            </div>
            <UiButton 
              v-if="isAdmin" 
              variant="danger" 
              size="sm" 
              :icon="Trash2"
              @click="handleDeleteStrategy(strat.id)"
            />
          </div>

          <div class="pt-2 flex items-center justify-between">
            <div class="text-xs text-slate-400">
              Ajouté le {{ new Date(strat.created_at).toLocaleDateString() }}
            </div>
            <div class="flex gap-3">
              <a v-if="strat.army_link" :href="strat.army_link" target="_blank" class="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <ExternalLink class="w-4 h-4" />
                Lien Armée
              </a>
              <a v-if="strat.video_url" :href="strat.video_url" target="_blank" class="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <PlayCircle class="w-4 h-4" />
                Voir Tuto
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <ClientOnly>
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAddModal = false"></div>
        <div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-900">Proposer une stratégie</h2>
            <button @click="showAddModal = false" class="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X class="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form @submit.prevent="handleAddStrategy" class="p-6 space-y-4">
            <UiInput v-model="newStrat.title" label="Nom de la compo" placeholder="ex: Queen Walk Hybrid" required />
            <div class="space-y-1">
              <label class="block text-sm font-medium text-slate-700">Description</label>
              <textarea v-model="newStrat.description" class="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-4 py-2.5 min-h-[100px]" placeholder="Détails de l'attaque..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">Type</label>
                <select v-model="newStrat.type" class="w-full rounded-xl border-slate-300 bg-white text-slate-900 px-4 py-2.5">
                  <option value="ground">Sol</option>
                  <option value="air">Aérien</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </div>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-slate-700">TH Minimum</label>
                <input v-model.number="newStrat.min_town_hall" type="number" class="w-full rounded-xl border border-slate-300 bg-white text-slate-900 px-4 py-2.5" />
              </div>
            </div>
            <UiInput v-model="newStrat.army_link" label="Lien de l'armée" placeholder="https://link.clashofclans.com/..." />
            <UiInput v-model="newStrat.video_url" label="Lien Vidéo (YouTube)" placeholder="https://www.youtube.com/watch?v=..." />
            <div class="flex gap-3 mt-6">
              <UiButton type="button" variant="outline" block @click="showAddModal = false">Annuler</UiButton>
              <UiButton type="submit" variant="primary" block :loading="isAdding">Proposer</UiButton>
            </div>
          </form>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
