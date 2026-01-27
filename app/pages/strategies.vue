<script setup lang="ts">
import { Layers, Sword, Wind, ExternalLink, Plus, Loader2, Trash2, ChevronDown, Pencil, Image as ImageIcon } from 'lucide-vue-next'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'
import AppSidebar from '~/components/ui/Sidebar.vue'
import UiSelect from '~/components/ui/Select.vue'
import UiImageUpload from '~/components/ui/ImageUpload.vue'
import UiGridCard from '~/components/ui/GridCard.vue'
import UiImageModal from '~/components/ui/ImageModal.vue'
import UiTextarea from '~/components/ui/Textarea.vue'

definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { uploadImage } = useImageUpload()

const profile = ref<any>(null)
const strategies = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const isAdding = ref(false)
const showSidebar = ref(false)
const editingStratId = ref<string | null>(null)
const selectedType = ref('Tout')
const selectedTH = ref('Tout')
const isMounted = ref(false)

// Image modal state
const showImageModal = ref(false)
const modalImageUrl = ref('')

// Image upload state
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)


const thLevels = ['Tout', 18, 17, 16]

const newStrat = ref({
  title: '',
  description: '',
  type: 'ground',
  min_town_hall: 16,
  army_link: '',
  video_url: '',
  image_url: ''
})
const errors = ref<Record<string, string>>({})

const types = [
  { id: 'Tout', icon: Layers, label: 'Tout' },
  { id: 'ground', icon: Sword, label: 'Sol' },
  { id: 'air', icon: Wind, label: 'Aérien' },
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
    console.error('Erreur lors de la récupération des stratégies :', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const isAdmin = computed(() => profile.value?.user_type === 'admin')

const copyToClipboard = (link: string) => {
  navigator.clipboard.writeText(link)
  alert('Lien copié dans le presse-papier !')
}

onMounted(async () => {
  isMounted.value = true
  await fetchProfile()
  await fetchStrategies()
})

const handleAddStrategy = async () => {
  errors.value = {}
  
  if (!newStrat.value.title) errors.value.title = 'Le nom est obligatoire'
  if (!newStrat.value.description) errors.value.description = 'La description est obligatoire'
  if (!newStrat.value.army_link) errors.value.army_link = 'Le lien de l\'armée est obligatoire'
  if (!imageFile.value && !newStrat.value.image_url) errors.value.image = 'L\'image est obligatoire'
  
  if (Object.keys(errors.value).length > 0) return
  
  isAdding.value = true
  try {
    let image_url = newStrat.value.image_url
    
    // Upload new image if selected
    if (imageFile.value) {
      image_url = await uploadImage(imageFile.value, 'strategies')
    }

    const payload = { ...newStrat.value, image_url }

    if (editingStratId.value) {
      const { error: err } = await (supabase.from('strategies') as any)
        .update(payload)
        .eq('id', editingStratId.value)
      
      if (err) throw err
    } else {
      const { error: err } = await (supabase.from('strategies') as any).insert([payload])
      if (err) throw err
    }
    
    await fetchStrategies()
    closeSidebar()
  } catch (err: any) {
    console.error('Erreur lors de l’enregistrement de la stratégie :', err)
    alert('Erreur : ' + err.message)
  } finally {
    isAdding.value = false
  }
}

const openEditSidebar = (strat: any) => {
  editingStratId.value = strat.id
  newStrat.value = {
    title: strat.title,
    description: strat.description,
    type: strat.type,
    min_town_hall: strat.min_town_hall,
    army_link: strat.army_link || '',
    video_url: strat.video_url || '',
    image_url: strat.image_url || ''
  }
  imagePreview.value = strat.image_url || null
  imageFile.value = null
  showSidebar.value = true
}

const closeSidebar = () => {
  showSidebar.value = false
  editingStratId.value = null
  newStrat.value = { title: '', description: '', type: 'ground', min_town_hall: 16, army_link: '', video_url: '', image_url: '' }
  errors.value = {}
  imageFile.value = null
  imagePreview.value = null
}

const handleDeleteStrategy = async (id: string) => {
  if (!confirm('Voulez-vous vraiment supprimer cette stratégie ?')) return
  const { error: err } = await supabase.from('strategies').delete().eq('id', id)
  if (!err) {
    await fetchStrategies()
  } else {
    alert('Erreur lors de la suppression : ' + err.message)
  }
}

const filteredStrats = computed(() => {
  if (!strategies.value) return []
  return strategies.value.filter(s => {
    const matchType = selectedType.value === 'Tout' || s.type === selectedType.value
    const matchTH = selectedTH.value === 'Tout' || Number(s.min_town_hall) === Number(selectedTH.value)
    return matchType && matchTH
  })
})
</script>

<template>
  <div class="space-y-8 max-sm:pb-8">
    <!-- HEADER & FILTERS -->
    <div class="flex flex-col gap-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Layers class="w-5 h-5" />
            </div>
            Stratégies
          </h1>
        </div>

        <div v-if="isMounted" class="flex flex-wrap items-center gap-3">
          <div class="relative">
            <select 
              v-model="selectedTH" 
              class="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-w-[120px]"
            >
              <option v-for="th in thLevels" :key="th" :value="th">
                {{ th === 'Tout' ? 'Tous les HDV' : 'HDV ' + th }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <UiButton @click="showSidebar = true" :icon="Plus" variant="primary">Ajouter une stratégie</UiButton>
        </div>
      </div>

      <!-- Type Navigation -->
      <div v-if="isMounted" class="flex items-center border-b border-slate-100 -mx-2 px-2">
        <div class="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          <button 
            v-for="type in types" 
            :key="type.id"
            @click="selectedType = type.id"
            class="relative py-3 text-sm font-bold transition-all whitespace-nowrap"
            :class="selectedType === type.id ? 'text-indigo-900' : 'text-slate-400 hover:text-slate-600'"
          >
            <div class="flex items-center gap-2">
              <component :is="type.icon" class="w-4 h-4" />
              {{ type.label }}
            </div>
            <div 
              v-if="selectedType === type.id" 
              class="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
            ></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <ClientOnly>
      <div v-if="isMounted" class="space-y-8">
        <UiAlert v-if="error" title="Erreur" variant="destructive">
          <p>{{ error }}</p>
          <UiButton size="sm" variant="outline" class="mt-3" @click="fetchStrategies">Réessayer</UiButton>
        </UiAlert>

        <!-- Loading Grid -->
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="aspect-[4/3] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-slate-200 animate-spin" />
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredStrats.length === 0" class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <div class="max-w-xs mx-auto space-y-4">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <Layers class="w-8 h-8" />
            </div>
            <h3 class="font-bold text-slate-900">Aucune stratégie trouvée</h3>
            <p class="text-slate-500 text-sm">Affiniez vos filtres ou proposez la première stratégie !</p>
            <UiButton size="sm" variant="outline" @click="selectedTH = 'Tout'; selectedType = 'Tout'">Réinitialiser les filtres</UiButton>
          </div>
        </div>

        <!-- Cards Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UiGridCard
            v-for="strat in filteredStrats"
            :key="strat.id"
            :image-url="strat.image_url"
            :title="strat.title"
            :description="strat.description"
            :date="strat.created_at"
            :video-url="strat.video_url"
            :badges="[
              { label: `HDV ${strat.min_town_hall}` },
              { label: strat.type === 'ground' ? 'Sol' : 'Aérien', variant: 'accent' }
            ]"
            :primary-action="strat.army_link ? { label: 'Armée', link: strat.army_link } : undefined"
            :secondary-action="strat.army_link ? { label: 'Copier', icon: 'copy', onClick: () => copyToClipboard(strat.army_link) } : undefined"
            :admin-actions="isAdmin ? [
              { icon: 'edit', onClick: () => openEditSidebar(strat) },
              { icon: 'delete', onClick: () => handleDeleteStrategy(strat.id) }
            ] : []"
            variant="strategy"
            @image-click="(url) => { modalImageUrl = url; showImageModal = true }"
          />
        </div>

      </div>
    </ClientOnly>

    <!-- Image Modal -->
    <UiImageModal 
      :show="showImageModal" 
      :image-url="modalImageUrl" 
      @close="showImageModal = false" 
    />


    <!-- Sidebar Form -->
    <AppSidebar :show="showSidebar" :title="editingStratId ? 'Modifier la stratégie' : 'Ajouter une stratégie'" @close="closeSidebar">
      <form id="add-strat-form" @submit.prevent="handleAddStrategy" class="space-y-5">
        <UiInput v-model="newStrat.title" label="Nom de la compo" placeholder="ex: Queen Walk Hybrid" :error="errors.title" />
        
        <UiTextarea 
          v-model="newStrat.description" 
          label="Description" 
          placeholder="Détails de l'attaque..." 
          :error="errors.description" 
        />

        <div class="grid grid-cols-2 gap-4">
          <UiSelect v-model="newStrat.type" label="Type" :options="[{label: 'Sol', value: 'ground'}, {label: 'Aérien', value: 'air'}]" />
          <UiSelect v-model="newStrat.min_town_hall" label="HDV Minimum" :options="[18, 17, 16]" />
        </div>

        <UiInput v-model="newStrat.army_link" label="Lien de l'armée Clash Of Clans" placeholder="https://link.clashofclans.com/..." :error="errors.army_link" />
        
        <UiInput v-model="newStrat.video_url" label="Lien de la vidéo tuto sur YouTube" placeholder="https://www.youtube.com/watch?v=..." />
        
        <UiImageUpload v-model="imageFile" :preview="imagePreview" @update:preview="imagePreview = $event" :error="errors.image" />
      </form>

      <template #footer>
        <div class="grid grid-cols-2 gap-3">
           <UiButton type="button" variant="outline" @click="closeSidebar">Annuler</UiButton>
           <UiButton type="submit" form="add-strat-form" variant="primary" :loading="isAdding">
             {{ editingStratId ? 'Enregistrer' : 'Confirmer' }}
           </UiButton>
        </div>
      </template>
    </AppSidebar>
  </div>
</template>
