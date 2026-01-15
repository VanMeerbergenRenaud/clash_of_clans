<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RotateCcw, UserMinus, Shield, ChevronDown, ChevronRight } from 'lucide-vue-next'
import MemberStatusCard from './MemberStatusCard.vue'

interface Member {
  id: string
  name: string
  role: string
  clanTag: string
  clanName: string
  warPreference?: string
  warNote?: string
  cwlDay?: number
  clanOrder?: number // Added for sorting
  league?: any
  leagueTier?: any
  // helper status
  status?: 'available' | 'war_excluded' | 'cwl_rotation'
}

const props = defineProps<{
  initialmembers?: Member[]
}>()

const supabase = useSupabaseClient()

// Store collapsed state separately so it persists across data refreshes
const collapsedClans = ref<Set<string>>(new Set())

// Structure: Map<ClanTag, { ... }>
// We use a list instead of a Record to easily sort
const clanBuckets = ref<{ tag: string, name: string, order: number, pool: Member[], war: Member[], cwl: Member[] }[]>([])

const toggleCollapse = (tag: string) => {
  if (collapsedClans.value.has(tag)) {
    collapsedClans.value.delete(tag)
  } else {
    collapsedClans.value.add(tag)
  }
}

const initBuckets = () => {
  const buckets: Record<string, { tag: string, name: string, order: number, pool: Member[], war: Member[], cwl: Member[] }> = {}
  
  if (props.initialmembers && props.initialmembers.length > 0) {
    console.log('WarPlanner initializing with members:', props.initialmembers.length)
    props.initialmembers.forEach(m => {
      if (!buckets[m.clanTag]) {
        // Attempt to find order or default to 999
        buckets[m.clanTag] = { 
            tag: m.clanTag, 
            name: m.clanName, 
            order: m.clanOrder ?? 999, // Use nullish coalescing
            pool: [], 
            war: [], 
            cwl: [] 
        }
      }
      
      const status = m.status || 'available'
      const bucket = buckets[m.clanTag]!
      
      // Strict check for status
      if (status === 'war_excluded') {
        bucket.war.push(m)
      } else if (status === 'cwl_rotation') {
        bucket.cwl.push(m)
      } else {
        bucket.pool.push(m)
      }
    })
  } else {
    console.log('WarPlanner initializing with EMPTY members')
  }
  
  // Convert to array and sort
  clanBuckets.value = Object.values(buckets).sort((a, b) => {
      if (typeof a.order === 'number' && typeof b.order === 'number' && a.order !== b.order) {
          return a.order - b.order
      }
      return a.name.localeCompare(b.name)
  })
}

watch(() => props.initialmembers, initBuckets, { immediate: true })

// When an item is moved to a new bucket via button click
const handleMove = async (item: Member, newType: 'pool' | 'war' | 'cwl') => {
  // Update local state first (Optimistic)
  const currentBucket = clanBuckets.value.find(b => b.tag === item.clanTag)
  if (!currentBucket) return

  // Find where it is and remove it
  const sourceTypes: ('pool' | 'war' | 'cwl')[] = ['pool', 'war', 'cwl']
  for (const t of sourceTypes) {
    const idx = currentBucket[t].findIndex(m => m.id === item.id)
    if (idx !== -1) {
      currentBucket[t].splice(idx, 1)
      break
    }
  }

  // Add to new list
  currentBucket[newType].push(item)

  // Update item internal state
  const statusMap = {
    'pool': 'available',
    'war': 'war_excluded',
    'cwl': 'cwl_rotation'
  }
  item.status = statusMap[newType] as any
  
  // Reset local properties to match DB logic
  if (newType === 'pool') {
      item.warNote = undefined
      item.cwlDay = undefined
  } else if (newType === 'war') {
      item.warNote = undefined 
      item.cwlDay = undefined
  } else if (newType === 'cwl') {
      item.warNote = undefined
      item.cwlDay = undefined
  }
  
  // Update DB
  updateMemberInDb(item, statusMap[newType] as any).catch(e => console.error("DB Sync failed", e))
}

const handleNote = async (item: Member, field: 'war_note' | 'cwl_day', value: any) => {
   // OPTIMISTIC UPDATE
   if (field === 'war_note') item.warNote = value
   if (field === 'cwl_day') item.cwlDay = value
   
   // DB Update in background
   updateNoteInDb(item, field, value).catch(e => console.error("DB Note Sync failed", e))
}

// DB Helpers
const updateMemberInDb = async (member: Member, status: 'available' | 'war_excluded' | 'cwl_rotation') => {
  // Ensure we have correct IDs
  if (!member.id || !member.clanTag) {
    console.error('Missing ID or ClanTag for member update', member)
    return
  }

  // Baseline data: everything to default 'available' or null
  const updateData: any = {
    tag: member.id,
    clan_tag: member.clanTag,
    name: member.name,
    war_status: 'available',
    cwl_status: 'available',
    war_note: null,
    cwl_day: null
  }

  // Apply exclusions based on UI section
  if (status === 'war_excluded') {
      updateData.war_status = 'excluded'
  } else if (status === 'cwl_rotation') {
      updateData.cwl_status = 'excluded'
  }
  // status === 'available' keeps the baseline reset

  console.log(`[Dashboard] Hard Reset/Update member ${member.name} (${status}) -> DB:`, updateData)

  const { error } = await (supabase.from('planning_members') as any).upsert(updateData)
  if (error) throw error
}

const updateNoteInDb = async (member: Member, field: 'war_note' | 'cwl_day', value: any) => {
     // When updating a note, we also send the current status to be absolutely sure
     const statusMap = {
        'available': { war: 'available', cwl: 'available' },
        'war_excluded': { war: 'excluded', cwl: 'available' },
        'cwl_rotation': { war: 'available', cwl: 'excluded' }
     }
     const currentStatus = statusMap[member.status || 'available']

     const payload = {
       tag: member.id,
       clan_tag: member.clanTag,
       name: member.name,
       war_status: currentStatus.war,
       cwl_status: currentStatus.cwl,
       [field]: value 
     }

     console.log(`[Dashboard] Updating note/day for ${member.name} -> DB:`, payload)
     
     const { error } = await (supabase.from('planning_members') as any).upsert(payload)
     if (error) throw error
}

</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      
      <!-- Pool Column -->
      <div class="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div class="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 class="font-bold text-slate-700 flex items-center gap-2">
            <Shield class="w-4 h-4 text-indigo-500" />
            Membres Disponibles
          </h3>
        </div>
        <div class="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-4">
           <div v-for="bucket in clanBuckets" :key="bucket.tag" class="space-y-2">
              <button @click="toggleCollapse(bucket.tag)" class="w-full sticky top-0 z-10 bg-slate-100/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 uppercase flex justify-between items-center hover:bg-slate-200 transition-colors cursor-pointer">
                <span class="flex items-center gap-1">
                   <ChevronRight v-if="collapsedClans.has(bucket.tag)" class="w-3 h-3" />
                   <ChevronDown v-else class="w-3 h-3" />
                   {{ bucket.name }}
                </span>
                <span v-if="collapsedClans.has(bucket.tag)" class="text-xs text-slate-400 bg-white px-1.5 rounded border border-slate-200">{{ bucket.pool.length }}</span>
              </button>
              
              <div v-if="!collapsedClans.has(bucket.tag)" class="space-y-2 px-1">
                <MemberStatusCard 
                    v-for="m in bucket.pool" 
                    :key="m.id" 
                    :member="m" 
                    type="pool"
                    @move="(item, target) => handleMove(item, target)"
                    @note="handleNote"
                />
                <div v-if="bucket.pool.length === 0" class="text-center py-2 text-xs text-slate-400 italic">Aucun membre</div>
              </div>
           </div>
        </div>
      </div>

      <!-- War Column -->
      <div class="flex flex-col bg-white rounded-2xl border border-red-100 overflow-hidden shadow-sm">
        <div class="p-4 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
          <h3 class="font-bold text-red-700 flex items-center gap-2">
            <UserMinus class="w-4 h-4" />
            Exclus Guerre
          </h3>
        </div>
        <div class="flex-1 overflow-y-auto bg-red-50/10 p-2 space-y-4">
           <div v-for="bucket in clanBuckets" :key="bucket.tag" class="space-y-2">
              <button @click="toggleCollapse(bucket.tag)" class="w-full sticky top-0 z-10 bg-red-50/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-red-800 border border-red-100 uppercase flex justify-between items-center hover:bg-red-100/50 transition-colors cursor-pointer">
                <span class="flex items-center gap-1">
                   <ChevronRight v-if="collapsedClans.has(bucket.tag)" class="w-3 h-3" />
                   <ChevronDown v-else class="w-3 h-3" />
                   {{ bucket.name }}
                </span>
                <span v-if="collapsedClans.has(bucket.tag)" class="text-xs text-red-400 bg-white px-1.5 rounded border border-red-100">{{ bucket.war.length }}</span>
              </button>
              
              <div v-if="!collapsedClans.has(bucket.tag)" class="space-y-2 px-1">
                <MemberStatusCard 
                    v-for="m in bucket.war" 
                    :key="m.id" 
                    :member="m" 
                    type="war"
                    @move="(item, target) => handleMove(item, target)"
                    @note="handleNote"
                />
                <div v-if="bucket.war.length === 0" class="text-center py-2 text-xs text-slate-400 italic">Vide</div>
              </div>
           </div>
        </div>
      </div>

       <!-- CWL Column -->
      <div class="flex flex-col bg-white rounded-2xl border border-amber-100 overflow-hidden shadow-sm">
        <div class="p-4 border-b border-amber-50 bg-amber-50/30 flex justify-between items-center">
          <h3 class="font-bold text-amber-700 flex items-center gap-2">
            <RotateCcw class="w-4 h-4" />
            Rotation CWL
          </h3>
        </div>
        <div class="flex-1 overflow-y-auto bg-amber-50/10 p-2 space-y-4">
           <div v-for="bucket in clanBuckets" :key="bucket.tag" class="space-y-2">
              <button @click="toggleCollapse(bucket.tag)" class="w-full sticky top-0 z-10 bg-amber-50/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 border border-amber-100 uppercase flex justify-between items-center hover:bg-amber-100/50 transition-colors cursor-pointer">
                 <span class="flex items-center gap-1">
                   <ChevronRight v-if="collapsedClans.has(bucket.tag)" class="w-3 h-3" />
                   <ChevronDown v-else class="w-3 h-3" />
                   {{ bucket.name }}
                 </span>
                 <span v-if="collapsedClans.has(bucket.tag)" class="text-xs text-amber-400 bg-white px-1.5 rounded border border-amber-100">{{ bucket.cwl.length }}</span>
              </button>
              
              <div v-if="!collapsedClans.has(bucket.tag)" class="space-y-2 px-1">
                <MemberStatusCard 
                    v-for="m in bucket.cwl" 
                    :key="m.id" 
                    :member="m" 
                    type="cwl"
                    @move="(item, target) => handleMove(item, target)"
                    @note="handleNote"
                />
                <div v-if="bucket.cwl.length === 0" class="text-center py-2 text-xs text-slate-400 italic">Vide</div>
              </div>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>
