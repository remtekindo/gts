<script setup lang="ts">
export interface PalettePart {
  label: string
  numbers: number[]
}

export type MarkStatus = 'correct' | 'wrong' | 'unanswered'

const props = defineProps<{
  parts: PalettePart[]
  current: number
  answered: Record<number, string>
  /** When provided, the palette renders result colors instead of progress colors. */
  status?: Record<number, MarkStatus>
}>()

const emit = defineEmits<{ select: [n: number] }>()

function circleClass(n: number): string {
  const base = 'w-9 h-9 shrink-0 rounded-full text-xs font-semibold flex items-center justify-center border transition-colors cursor-pointer'
  if (props.status) {
    const s = props.status[n]
    if (s === 'correct') return `${base} bg-green-500 border-green-500 text-white`
    if (s === 'wrong') return `${base} bg-red-500 border-red-500 text-white`
    return `${base} bg-slate-100 border-slate-200 text-slate-400`
  }
  if (n === props.current) return `${base} bg-blue-600 border-blue-600 text-white ring-2 ring-blue-200`
  if (props.answered[n]) return `${base} bg-blue-100 border-blue-300 text-blue-800`
  return `${base} bg-white border-slate-300 text-slate-500 hover:border-blue-400`
}
</script>

<template>
  <div class="flex items-start gap-6 overflow-x-auto no-scrollbar py-1">
    <div v-for="part in parts" :key="part.label" class="shrink-0">
      <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{{ part.label }}</p>
      <div class="flex gap-1.5">
        <button
          v-for="n in part.numbers"
          :key="n"
          :class="circleClass(n)"
          :aria-label="`Go to question ${n}`"
          @click="emit('select', n)"
        >
          {{ n }}
        </button>
      </div>
    </div>
  </div>
</template>
