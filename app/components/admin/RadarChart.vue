<script setup lang="ts">
const props = defineProps<{
  /** axis labels, e.g. ["Part 1", ...] */
  labels: string[]
  /** 0..1 values, same length as labels */
  values: number[]
}>()

const SIZE = 220
const C = SIZE / 2
const R = 78

function point(i: number, frac: number): [number, number] {
  const n = props.labels.length
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2
  const r = R * Math.max(0, Math.min(1, frac))
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)]
}

function ringPath(frac: number): string {
  return props.labels.map((_, i) => point(i, frac).join(',')).join(' ')
}

function labelPos(i: number): [number, number] {
  const [x, y] = point(i, 1.18)
  return [Math.max(28, Math.min(SIZE - 28, x)), Math.max(12, Math.min(SIZE - 6, y))]
}

const valuePath = computed(() => ringPath(1).split(' ').map((_, i) => point(i, props.values[i] ?? 0).join(',')).join(' '))
</script>

<template>
  <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="w-full max-w-[240px] mx-auto" role="img" aria-label="Ability radar chart">
    <!-- grid rings -->
    <polygon v-for="f in [0.25, 0.5, 0.75, 1]" :key="f" :points="ringPath(f)" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="1" class="text-slate-500" />
    <!-- axes -->
    <line v-for="(_, i) in labels" :key="'a' + i" :x1="C" :y1="C" :x2="point(i, 1)[0]" :y2="point(i, 1)[1]" stroke="currentColor" stroke-opacity="0.15" stroke-width="1" class="text-slate-500" />
    <!-- values -->
    <polygon :points="valuePath" fill="rgb(59 130 246 / 0.25)" stroke="#3b82f6" stroke-width="2" />
    <circle v-for="(_, i) in labels" :key="'d' + i" :cx="point(i, values[i] ?? 0)[0]" :cy="point(i, values[i] ?? 0)[1]" r="3.5" fill="#3b82f6" />
    <!-- labels -->
    <text
      v-for="(lb, i) in labels" :key="'l' + i"
      :x="labelPos(i)[0]" :y="labelPos(i)[1]"
      text-anchor="middle" dominant-baseline="middle"
      class="fill-slate-500 dark:fill-slate-400"
      font-size="10" font-weight="600"
    >{{ lb }} {{ Math.round((values[i] ?? 0) * 100) }}%</text>
  </svg>
</template>
