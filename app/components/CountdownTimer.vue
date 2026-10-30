<script setup lang="ts">
const props = defineProps<{ totalSeconds: number }>()
const emit = defineEmits<{ expire: [] }>()

const remaining = ref(props.totalSeconds)
let timer: ReturnType<typeof setInterval> | null = null

const formatted = computed(() => {
  const s = Math.max(0, remaining.value)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
})

const urgent = computed(() => remaining.value < 300)

onMounted(() => {
  timer = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      if (timer) clearInterval(timer)
      emit('expire')
    }
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums"
    :class="urgent ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path stroke-linecap="round" d="M12 7v5l3 2" />
    </svg>
    {{ formatted }}
  </span>
</template>
