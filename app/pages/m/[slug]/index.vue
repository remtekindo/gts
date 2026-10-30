<script setup lang="ts">
import { getMaterialOrFallback, papersForMaterial } from '~/data/mock'

definePageMeta({ layout: 'material' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const material = computed(() => getMaterialOrFallback(slug.value))
const base = computed(() => `/m/${slug.value}`)

const auth = ref<AuthState | null>(null)
const displayName = ref('')

onMounted(() => {
  auth.value = getAuth()
  displayName.value = getDisplayName()
})

const username = computed(() => displayName.value || auth.value?.username || 'Guest')

const stats = [
  { label: 'Points', value: '1,250', sub: '+120 this week' },
  { label: 'Streak', value: '6 days', sub: 'Keep it going' },
  { label: 'Rank', value: '#42', sub: 'Top 8% this month' }
]

const quests = ref([
  { label: 'Complete 1 full simulation', done: true },
  { label: 'Score above 700 on any paper', done: true },
  { label: 'Finish 3 drill packs', done: false }
])
const questDone = computed(() => quests.value.filter(q => q.done).length)

const papers = computed(() => papersForMaterial(slug.value))
const availablePapers = computed(() => papers.value.slice(0, 3))
const continuePaper = computed(() => papers.value[0])
</script>

<template>
  <div class="grid lg:grid-cols-3 gap-5">
    <!-- Left column -->
    <div class="lg:col-span-2 space-y-5">
      <!-- Profile card -->
      <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
        <p class="text-blue-200 text-sm">Welcome back,</p>
        <h1 class="text-2xl font-extrabold mt-0.5">{{ username }}</h1>
        <p class="text-blue-200 text-sm mt-1">Your predicted {{ material.name }} score is waiting. Take a test to find your level.</p>
      </div>

      <!-- Stat tiles -->
      <div class="grid grid-cols-3 gap-4">
        <StatTile v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :sub="s.sub" />
      </div>

      <!-- Quest card -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-800">Weekly Quest</h2>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Ends in 2d 4h</span>
        </div>
        <ul class="mt-4 space-y-2.5">
          <li v-for="q in quests" :key="q.label" class="flex items-center gap-3 text-sm">
            <span
              class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              :class="q.done ? 'bg-green-500 text-white' : 'border-2 border-slate-300 text-transparent'"
            >✓</span>
            <span :class="q.done ? 'text-slate-400 line-through' : 'text-slate-600'">{{ q.label }}</span>
          </li>
        </ul>
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-slate-500">{{ questDone }}/{{ quests.length }} completed</p>
          <button class="text-sm font-semibold px-4 py-2 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors">
            Claim Points
          </button>
        </div>
        <div class="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full bg-amber-400 rounded-full transition-all" :style="{ width: `${(questDone / quests.length) * 100}%` }" />
        </div>
      </div>

      <!-- Performance card -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-800">Performance</h2>
          <NuxtLink :to="`${base}/performance`" class="text-sm font-medium text-blue-600 hover:text-blue-700">See Full Analytics →</NuxtLink>
        </div>
        <div class="mt-2 flex items-center gap-6">
          <!-- Radar placeholder (inline SVG) -->
          <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Skill radar (demo placeholder)">
            <polygon points="60,15 102.8,46.1 86.5,96.4 33.5,96.4 17.2,46.1" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
            <polygon points="60,28.5 90,50.3 78.6,85.5 41.4,85.5 30,50.3" fill="rgba(37,99,235,0.18)" stroke="#2563eb" stroke-width="2" />
            <g font-size="7" fill="#94a3b8" text-anchor="middle">
              <text x="60" y="10">Listening</text>
              <text x="110" y="48">Reading</text>
              <text x="92" y="108">Grammar</text>
              <text x="28" y="108">Vocab</text>
              <text x="10" y="48">Speed</text>
            </g>
          </svg>
          <ul class="text-sm space-y-2 text-slate-600">
            <li class="flex justify-between gap-6"><span>Listening</span><strong class="text-slate-800">385</strong></li>
            <li class="flex justify-between gap-6"><span>Reading</span><strong class="text-slate-800">410</strong></li>
            <li class="flex justify-between gap-6"><span>Grammar</span><strong class="text-slate-800">72%</strong></li>
            <li class="flex justify-between gap-6"><span>Vocabulary</span><strong class="text-slate-800">81%</strong></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Right column -->
    <div class="space-y-5">
      <!-- Performance journey -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 class="font-bold text-slate-800">Performance Journey</h2>
        <svg viewBox="0 0 300 120" class="w-full h-28 mt-3" role="img" aria-label="Score trend (demo placeholder)">
          <path d="M0,90 L40,75 L80,80 L120,60 L160,65 L200,45 L240,50 L280,30 L300,35 L300,120 L0,120 Z" fill="rgba(37,99,235,0.1)" />
          <polyline points="0,90 40,75 80,80 120,60 160,65 200,45 240,50 280,30 300,35" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="280" cy="30" r="4" fill="#2563eb" />
        </svg>
        <div class="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 uppercase tracking-wide font-medium">Overall Score</p>
            <p class="text-2xl font-extrabold text-slate-800">795 <span class="text-sm font-medium text-slate-400">/ 990</span></p>
          </div>
          <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">CEFR · B2</span>
        </div>
      </div>

      <!-- Continue -->
      <div class="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <h2 class="font-bold text-slate-800">Continue from where you left off</h2>
        <p class="mt-1 text-sm text-slate-500">{{ continuePaper?.title }} · pick up your test</p>
        <NuxtLink
          :to="`${base}/papers/${continuePaper?.id}/take`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Resume Test
        </NuxtLink>
      </div>

      <!-- Available papers -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-bold text-slate-800">Available Papers</h2>
          <NuxtLink :to="`${base}/papers`" class="text-sm font-medium text-blue-600 hover:text-blue-700">View all →</NuxtLink>
        </div>
        <div class="space-y-4">
          <PaperCard v-for="p in availablePapers" :key="p.id" :paper="p" :base="base" />
        </div>
      </div>
    </div>
  </div>
</template>
