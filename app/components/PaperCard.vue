<script setup lang="ts">
import type { Paper } from '~/data/mock'

const props = defineProps<{ paper: Paper }>()

const statusStyle: Record<Paper['status'], string> = {
  'not-started': 'bg-slate-100 text-slate-600',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700'
}

const statusLabel: Record<Paper['status'], string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed'
}

const cta = computed(() => {
  if (props.paper.status === 'completed') return { label: 'View Result', to: `/papers/${props.paper.id}/result` }
  if (props.paper.status === 'in-progress') return { label: 'Continue', to: `/papers/${props.paper.id}` }
  return { label: 'Start Test', to: `/papers/${props.paper.id}` }
})
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
    <div class="h-28 bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center relative">
      <span class="text-4xl font-extrabold text-white/90">{{ paper.title.charAt(0) }}</span>
      <span
        class="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
        :class="statusStyle[paper.status]"
      >
        {{ statusLabel[paper.status] }}
      </span>
    </div>
    <div class="p-4 flex flex-col gap-3 flex-1">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-blue-600">{{ paper.category }}</p>
        <h3 class="mt-0.5 font-semibold text-slate-800 leading-snug">{{ paper.title }}</h3>
      </div>
      <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Duration</dt>
          <dd>{{ paper.durationMinutes }} min</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Questions</dt>
          <dd>{{ paper.totalQuestions }} questions</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Difficulty</dt>
          <dd>{{ paper.difficulty }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Enrolled</dt>
          <dd>{{ paper.enrolled.toLocaleString('en-US') }} enrolled</dd>
        </div>
      </dl>
      <NuxtLink
        :to="cta.to"
        class="mt-auto w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        {{ cta.label }}
      </NuxtLink>
    </div>
  </div>
</template>
