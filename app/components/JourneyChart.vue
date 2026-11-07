<!-- Journey chart: one point per completed attempt, chronological.
     Each point is that attempt's accuracy mapped to the TOEIC LR scale
     (round5(10 + accuracy × 980)). X is evenly spaced by attempt order;
     a single attempt renders as one dot. No demo points ever — the
     parent renders this only when attempts exist. -->
<script setup lang="ts">
import type { PerfAttempt } from '~/utils/performance'

const props = defineProps<{ attempts: PerfAttempt[] }>()

const W = 300
const H = 120
const PAD_X = 8
const TOP = 12
const BOTTOM = 108

function yFor(score: number): number {
  return BOTTOM - ((score - 10) / 980) * (BOTTOM - TOP)
}

const points = computed(() => {
  const n = props.attempts.length
  if (n === 0) return []
  const step = n === 1 ? 0 : (W - PAD_X * 2) / (n - 1)
  const allSame = props.attempts.every(a => a.score === props.attempts[0]?.score)
  return props.attempts.map((a, i) => ({
    x: n === 1 ? W / 2 : PAD_X + i * step,
    y: allSame ? (TOP + BOTTOM) / 2 : yFor(a.score),
    date: a.date,
    score: a.score
  }))
})

const line = computed(() => points.value.map(p => `${p.x},${p.y}`).join(' '))
const area = computed(() => {
  if (points.value.length === 0) return ''
  const first = points.value[0] as { x: number, y: number }
  const last = points.value[points.value.length - 1] as { x: number, y: number }
  return `M${first.x},${BOTTOM} L${line.value} L${last.x},${BOTTOM} Z`
})
const lastPoint = computed(() => points.value[points.value.length - 1] ?? null)

function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const firstDate = computed(() => points.value[0] ? shortDate(points.value[0].date) : '')
const lastDate = computed(() => lastPoint.value ? shortDate(lastPoint.value.date) : '')
</script>

<template>
  <div>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-28" role="img" aria-label="Score trend across attempts">
      <path v-if="points.length > 1" :d="area" fill="rgba(37,99,235,0.1)" />
      <polyline v-if="points.length > 1" :points="line" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
      <circle
        v-for="p in points"
        :key="`${p.date}-${p.score}`"
        :cx="p.x"
        :cy="p.y"
        :r="p === lastPoint ? 4 : 3"
        :fill="p === lastPoint ? '#2563eb' : '#93c5fd'"
      />
    </svg>
    <div v-if="points.length > 0" class="flex justify-between text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
      <span>{{ firstDate }}</span>
      <span v-if="points.length > 1">{{ lastDate }}</span>
    </div>
  </div>
</template>
