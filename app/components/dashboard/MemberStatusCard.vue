<script setup lang="ts">
import { computed } from 'vue'
import { Swords, RotateCcw, Shield, UserMinus, ChevronRight, X } from 'lucide-vue-next'

interface Member {
  id: string
  name: string
  role: string
  clanTag: string
  clanName: string
  warPreference?: string
  warNote?: string
  cwlDay?: number
  league?: {
    id: number
    name: string
    iconUrls: {
      small?: string
      tiny?: string
      medium?: string
    }
  }
  leagueTier?: {
    id: number
    name: string
    iconUrls: {
      small?: string
      tiny?: string
      medium?: string
    }
  }
}

const props = defineProps<{
  member: Member
  type: 'pool' | 'war' | 'cwl'
}>()

const emit = defineEmits<{
  (e: 'move', item: Member, type: 'pool' | 'war' | 'cwl'): void
  (e: 'note', item: Member, type: 'war_note' | 'cwl_day', value: any): void
}>()

const translatedRole = computed(() => {
  const roles: Record<string, string> = {
    'leader': 'Chef',
    'coLeader': 'Chef Adjoint',
    'admin': 'Aîné',
    'member': 'Membre'
  }
  return roles[props.member.role] || props.member.role
})
</script>

<template>
  <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group relative">
    
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-3 overflow-hidden">
        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
          <img 
            v-if="member.leagueTier?.iconUrls?.small || member.league?.iconUrls?.small" 
            :src="member.leagueTier?.iconUrls?.small || member.league?.iconUrls?.small" 
            :title="member.leagueTier?.name || member.league?.name"
            class="w-6 h-6 object-contain" 
          />
          <div v-else class="text-indigo-600 font-bold text-xs uppercase">
            {{ member.name.substring(0,2) }}
          </div>
        </div>
        <div class="truncate">
          <div class="font-semibold text-sm text-slate-900 truncate">{{ member.name }}</div>
          <div class="text-[10px] text-slate-500 capitalize">{{ translatedRole }}</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1 shrink-0">
        <template v-if="type === 'pool'">
          <button 
            @click="emit('move', member, 'war')"
            class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Exclure Guerre"
          >
            <UserMinus class="w-4 h-4" />
          </button>
          <button 
            @click="emit('move', member, 'cwl')"
            class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            title="Rotation CWL"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </template>
        
        <template v-else>
          <!-- Switch to other section -->
          <button 
            v-if="type === 'war'"
            @click="emit('move', member, 'cwl')"
            class="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
            title="Passer en Rotation CWL"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
          <button 
            v-else
            @click="emit('move', member, 'war')"
            class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Exclure Guerre"
          >
            <UserMinus class="w-4 h-4" />
          </button>

          <!-- Reset to Available -->
          <button 
            @click="emit('move', member, 'pool')"
            class="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            title="Remettre Disponible"
          >
            <X class="w-4 h-4" />
          </button>
        </template>
      </div>
    </div>

    <!-- Inputs for War/CWL -->
    <div v-if="type === 'war'" class="mt-2 pt-2 border-t border-slate-50">
      <label class="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Indisponible jusque :</label>
      <select 
        class="w-full text-xs p-2 rounded-lg border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none transition-all bg-white"
        :value="member.warNote"
        @change="emit('note', member, 'war_note', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled selected>Choisir une durée...</option>
        <option value="la prochaine guerre">la prochaine guerre</option>
        <option value="la semaine prochaine">la semaine prochaine</option>
        <option value="le mois prochain">le mois prochain</option>
        <option value="jamais">jamais</option>
      </select> 
    </div>
    
    <div v-if="type === 'cwl'" class="mt-2 pt-2 border-t border-slate-50">
      <label class="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Remettre jour :</label>
      <div class="grid grid-cols-7 gap-1">
        <button 
          v-for="day in 7" 
          :key="day"
          @click="emit('note', member, 'cwl_day', day)"
          :class="[
            'text-[10px] font-bold h-6 w-full rounded flex items-center justify-center transition-colors',
            member.cwlDay == day ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-amber-100'
          ]"
        >
          {{ day }}
        </button>
      </div>
    </div>

  </div>
</template>
