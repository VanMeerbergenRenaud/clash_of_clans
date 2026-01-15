<script setup lang="ts">
import { Map, Copy, ExternalLink, Plus, Loader2, Home, ChevronDown, Trash2 } from 'lucide-vue-next'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiAlert from '~/components/ui/Alert.vue'
import UiSidebar from '~/components/ui/Sidebar.vue'
import UiSelect from '~/components/ui/Select.vue'
import UiImageUpload from '~/components/ui/ImageUpload.vue'
import UiGridCard from '~/components/ui/GridCard.vue'
import UiImageModal from '~/components/ui/ImageModal.vue'

// Default images mapping
import th18Img from '~/assets/img/th/th18.jpeg'
import th17Img from '~/assets/img/th/th17.jpeg'
import th16Img from '~/assets/img/th/th16.jpeg'

const thImages: Record<number | string, string> = { 18: th18Img, 17: th17Img, 16: th16Img }

definePageMeta({ layout: 'default' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { uploadImage } = useImageUpload()

const profile = ref<any>(null)
const bases = ref<any[]>([])
const loadingBases = ref(true)
const errorMessage = ref('')
const isMounted = ref(false)
const showSidebar = ref(false)
const isAdding = ref(false)
const isDeleting = ref<number | null>(null)

// Image modal state
const showImageModal = ref(false)
const modalImageUrl = ref('')


// Form state
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const newBase = ref({ title: '', th: 18, type: 'Guerre', link: '' })

// Filters
const selectedTH = ref('Tout')
const selectedType = ref('Tout')
const thLevels = ['Tout', 18, 17, 16]
const types = ['Tout', 'Légende', 'Ligue', 'Guerre', 'Fun']

const isAdmin = computed(() => profile.value?.user_type === 'admin')

const fetchProfile = async () => {
  if (!user.value?.id) return
  const { data } = await supabase.from('profiles').select('*').eq('id', user.value.id).single()
  profile.value = data
}

const fetchBases = async () => {
  loadingBases.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await supabase.from('base_link').select('*').order('created_at', { ascending: false })
    if (error) throw error
    bases.value = data || []
  } catch (err: any) {
    console.error('Erreur lors de la récupération des bases :', err)
    errorMessage.value = err.message
  } finally {
    loadingBases.value = false
  }
}

onMounted(async () => {
  isMounted.value = true
  await fetchProfile()
  await fetchBases()
})

const handleAddBase = async () => {
  if (!newBase.value.title || !newBase.value.link) return
  
  isAdding.value = true
  try {
    let image_url = ''
    if (imageFile.value) {
      image_url = await uploadImage(imageFile.value, 'bases')
    }

    const { error } = await (supabase.from('base_link') as any).insert({
      name: newBase.value.title,
      th: newBase.value.th,
      type: newBase.value.type.toLowerCase(),
      link: newBase.value.link,
      image_url
    })

    if (error) throw error
    
    await fetchBases()
    closeSidebar()
  } catch (err: any) {
    console.error('Erreur lors de l’ajout de la base :', err)
    alert('Erreur: ' + err.message)
  } finally {
    isAdding.value = false
  }
}

const closeSidebar = () => {
  showSidebar.value = false
  newBase.value = { title: '', th: 18, type: 'Guerre', link: '' }
  imageFile.value = null
  imagePreview.value = null
}

const copyToClipboard = (text: string) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  alert('Lien copié dans le presse-papier !')
}

const handleDeleteBase = async (id: number) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette base ?')) return
  
  isDeleting.value = id
  try {
    const { error } = await supabase.from('base_link').delete().eq('id', id)
    if (error) throw error
    await fetchBases()
  } catch (err: any) {
    console.error('Erreur lors de la suppression :', err)
    alert('Erreur: ' + err.message)
  } finally {
    isDeleting.value = null
  }
}

const filteredBases = computed(() => {
  if (!bases.value) return []
  return bases.value.filter(base => {
    const matchTH = selectedTH.value === 'Tout' || Number(base.th) === Number(selectedTH.value)
    const matchType = selectedType.value === 'Tout' || base.type?.toLowerCase() === selectedType.value.toLowerCase()
    return matchTH && matchType
  })
})
</script>

<template>
  <div class="space-y-8 pb-32">
    <!-- HEADER & FILTERS -->
    <div class="flex flex-col gap-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Home class="w-5 h-5" />
            </div>
            Bases
          </h1>
        </div>

        <div v-if="isMounted" class="flex items-center gap-3">
          <div class="relative">
            <select 
              v-model="selectedTH" 
              class="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all min-w-[120px]"
            >
              <option v-for="th in thLevels" :key="th" :value="th">
                {{ th === 'Tout' ? 'Tous les HDV' : 'HDV ' + th }}
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown class="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <UiButton @click="showSidebar = true" :icon="Plus" variant="primary">Ajouter une base</UiButton>
        </div>
      </div>

      <!-- Type Navigation -->
      <div v-if="isMounted" class="flex items-center border-b border-slate-100 -mx-2 px-2">
        <div class="flex items-center gap-8 overflow-x-auto scrollbar-hide">
          <button 
            v-for="type in types" 
            :key="type"
            @click="selectedType = type"
            class="relative py-3 text-sm font-bold transition-all whitespace-nowrap"
            :class="selectedType === type ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'"
          >
            {{ type }}
            <div v-if="selectedType === type" class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full"></div>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <ClientOnly>
      <div v-if="isMounted" class="space-y-8">
        <UiAlert v-if="errorMessage" title="Erreur" variant="destructive">
          <p>{{ errorMessage }}</p>
          <UiButton size="sm" variant="outline" class="mt-3" @click="fetchBases">Réessayer</UiButton>
        </UiAlert>

        <!-- Loading Grid -->
        <div v-if="loadingBases" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="aspect-[4/3] bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
            <Loader2 class="w-6 h-6 text-slate-200 animate-spin" />
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-else-if="filteredBases.length === 0" class="text-center py-24 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <div class="max-w-xs mx-auto space-y-4">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
               <Map class="w-8 h-8" />
            </div>
            <h3 class="font-bold text-slate-900">Aucune base trouvée</h3>
            <p class="text-slate-500 text-sm">Affiniez vos filtres ou ajoutez la première base !</p>
            <UiButton size="sm" variant="outline" @click="selectedTH = 'Tout'; selectedType = 'Tout'">Réinitialiser les filtres</UiButton>
          </div>
        </div>

        <!-- Cards Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UiGridCard
            v-for="base in filteredBases"
            :key="base.id"
            :image-url="base.image_url || thImages[base.th] || thImages[16]"
            :title="base.name || 'Base sans nom'"
            :date="base.created_at"
            :badges="[
              { label: `HDV ${base.th}` },
              { label: base.type, variant: 'accent' }
            ]"
            :primary-action="{ label: 'Copier la base dans Clash Of Clans', link: base.link }"
            :secondary-action="{ label: 'Copier', icon: 'copy', onClick: () => copyToClipboard(base.link) }"
            :admin-actions="isAdmin ? [{ icon: 'delete', onClick: () => handleDeleteBase(base.id) }] : []"
            variant="base"
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
    <UiSidebar :show="showSidebar" title="Ajouter une base" @close="closeSidebar">
      <form id="add-base-form" @submit.prevent="handleAddBase" class="space-y-5">
        <UiInput v-model="newBase.title" label="Nom de la base" placeholder="ex: Base Anti-3 Guerre" required />
        
        <div class="grid grid-cols-2 gap-4">
          <UiSelect v-model="newBase.th" label="HDV" :options="[18, 17, 16]" />
          <UiSelect v-model="newBase.type" label="Type" :options="types.filter(t => t !== 'Tout')" />
        </div>

        <UiInput v-model="newBase.link" label="Lien de la base" placeholder="https://link.clashofclans.com/..." required />

        <UiImageUpload v-model="imageFile" :preview="imagePreview" @update:preview="imagePreview = $event" />
      </form>

      <template #footer>
        <div class="grid grid-cols-2 gap-3">
           <UiButton type="button" variant="outline" @click="closeSidebar">Annuler</UiButton>
           <UiButton type="submit" form="add-base-form" variant="primary" :loading="isAdding">Confirmer</UiButton>
        </div>
      </template>
    </UiSidebar>
  </div>
</template>
