<script setup lang="ts">
import { getMaterialOrFallback, papersForMaterial } from '~/data/mock'

const { t } = useLocale()

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

const stats = computed(() => [
  { label: t('dashboard.points'), value: '1,250', sub: t('dashboard.pointsSub') },
  { label: t('dashboard.streak'), value: '6 days', sub: t('dashboard.streakSub') },
  { label: t('dashboard.rank'), value: '#42', sub: t('dashboard.rankSub') }
])

const quests = computed(() => [
  { label: t('dashboard.quest1'), done: true },
  { label: t('dashboard.quest2'), done: true },
  { label: t('dashboard.quest3'), done: false }
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
        <p class="text-blue-200 text-sm">{{ t('dashboard.welcomeBack') }}</p>
        <h1 class="text-2xl font-extrabold mt-0.5">{{ username }}</h1>
        <p class="text-blue-200 text-sm mt-1">{{ t('dashboard.heroSub', { name: material.name }) }}</p>
      </div>

      <!-- Stat tiles -->
      <div class="grid grid-cols-3 gap-4">
        <StatTile v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :sub="s.sub" />
      </div>

      <!-- Performance: journey + skills in one section -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.performance') }}</h2>
          <NuxtLink :to="`${base}/performance`" class="text-sm font-medium text-blue-600 hover:text-blue-700">{{ t('dashboard.seeAnalytics') }}</NuxtLink>
        </div>
        <p class="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t('dashboard.journey') }}</p>
        <svg viewBox="0 0 300 120" class="w-full h-28 mt-2" role="img" aria-label="Score trend (demo placeholder)">
          <path d="M0,90 L40,75 L80,80 L120,60 L160,65 L200,45 L240,50 L280,30 L300,35 L300,120 L0,120 Z" fill="rgba(37,99,235,0.1)" />
          <polyline points="0,90 40,75 80,80 120,60 160,65 200,45 240,50 280,30 300,35" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="280" cy="30" r="4" fill="#2563eb" />
        </svg>
        <div class="mt-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Overall Score</p>
            <p class="text-2xl font-extrabold text-slate-800 dark:text-slate-200">795 <span class="text-sm font-medium text-slate-400 dark:text-slate-500">/ 990</span></p>
          </div>
          <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">CEFR · B2</span>
        </div>
      </div>

    </div>

    <!-- Right column -->
    <div class="space-y-5">
      <!-- Quest card -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.questTitle') }}</h2>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">Ends in 2d 4h</span>
        </div>
        <ul class="mt-4 space-y-2.5">
          <li v-for="q in quests" :key="q.label" class="flex items-center gap-3 text-sm">
            <span
              class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              :class="q.done ? 'bg-green-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600 text-transparent'"
            >✓</span>
            <span :class="q.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300'">{{ q.label }}</span>
          </li>
        </ul>
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ questDone }}/{{ quests.length }} completed</p>
          <button class="text-sm font-semibold px-4 py-2 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors">
            Claim Points
          </button>
        </div>
        <div class="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div class="h-full bg-amber-400 rounded-full transition-all" :style="{ width: `${(questDone / quests.length) * 100}%` }" />
        </div>
      </div>

      <!-- Action cards: stacked under Quest -->
      <!-- Continue -->
      <div class="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 dark:bg-blue-950 p-5">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.continueTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ continuePaper?.title }} · {{ t('dashboard.continueSub') }}</p>
        <NuxtLink
          :to="`${base}/papers/${continuePaper?.id}/take`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {{ t('dashboard.resume') }}
        </NuxtLink>
      </div>

      <!-- Live test with AI -->
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-5">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('liveTest.cardTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('liveTest.cardSub') }}</p>
        <NuxtLink
          :to="`${base}/live-test`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          {{ t('liveTest.cardCta') }}
        </NuxtLink>
      </div>

      <!-- Personal playlist (adaptive) -->
      <div class="rounded-2xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950 p-5">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.playlistTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.playlistSub') }}</p>
        <NuxtLink
          :to="`${base}/playlist`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          {{ t('dashboard.playlistCta') }}
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Available papers: 3-column grid -->
  <div class="mt-5">
    <!-- Available papers -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.availablePapers') }}</h2>
        <NuxtLink :to="`${base}/papers`" class="text-sm font-medium text-blue-600 hover:text-blue-700">{{ t('dashboard.viewAll') }}</NuxtLink>
      </div>
      <div class="grid sm:grid-cols-3 gap-4">
        <PaperCard v-for="p in availablePapers" :key="p.id" :paper="p" :base="base" />
      </div>
    </div>
  </div>
</template>
