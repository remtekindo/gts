<script setup lang="ts">
import { getMaterialOrFallback } from '~/data/mock'
import { analyzeAbility, buildPlaylist, savePlaylist, type PartAbility } from '~/utils/adaptive'
import { getAuth } from '~/utils/storage'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const material = computed(() => getMaterialOrFallback(slug.value))
const base = computed(() => `/m/${slug.value}`)

const abilities = ref<PartAbility[]>([])
const playlistNums = ref<number[]>([])
const breakdown = ref<{ part: number; count: number; accuracy: number | null; level: number }[]>([])
const hasData = ref(false)

function rebuild(): void {
  const user = getAuth()
  abilities.value = analyzeAbility(slug.value, user?.username)
  hasData.value = abilities.value.some(a => a.answered > 0)
  const built = buildPlaylist(slug.value, 10, user?.username)
  playlistNums.value = built.questions.map(q => q.number)
  breakdown.value = built.breakdown
  savePlaylist(slug.value, built.questions)
}

function startPractice(): void {
  router.push(`${base.value}/practice`)
}

function barWidth(a: PartAbility): number {
  return a.accuracy === null ? 0 : Math.round(a.accuracy * 100)
}

function accuracyLabel(a: PartAbility): string {
  return a.accuracy === null ? t('playlist.noData') : `${Math.round(a.accuracy * 100)}%`
}

onMounted(rebuild)
</script>

<template>
  <div class="px-4 md:px-6 py-6 max-w-3xl mx-auto">
    <NuxtLink :to="base" class="text-sm font-semibold text-blue-600">← {{ material.name }}</NuxtLink>
    <h1 class="mt-2 text-xl md:text-2xl font-extrabold">{{ t('playlist.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('playlist.sub') }}</p>

    <!-- Ability analysis: the behind-the-scenes AI reading the user -->
    <section class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold">{{ t('playlist.abilityTitle') }}</h2>
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ t('playlist.abilitySub') }}</p>
      <p v-if="!hasData" class="mt-3 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
        {{ t('playlist.coldStart') }}
      </p>
      <ul class="mt-3 space-y-3">
        <li v-for="a in abilities" :key="a.part">
          <div class="flex items-center justify-between text-sm">
            <span class="font-semibold">Part {{ a.part }} <span class="text-xs font-normal text-slate-400">· {{ a.answered }} {{ t('playlist.answered') }}</span></span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">L{{ a.level }}</span>
          </div>
          <div class="mt-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="a.accuracy !== null && a.accuracy >= 0.8 ? 'bg-green-500' : a.accuracy !== null && a.accuracy < 0.5 ? 'bg-red-400' : 'bg-blue-500'"
              :style="{ width: barWidth(a) + '%' }"
            />
          </div>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {{ accuracyLabel(a) }}
            <span v-if="a.accuracy !== null && a.accuracy < 0.5" class="font-semibold text-red-500">· {{ t('playlist.weak') }}</span>
            <span v-else-if="a.accuracy !== null && a.accuracy >= 0.8" class="font-semibold text-green-600">· {{ t('playlist.strong') }}</span>
          </p>
        </li>
      </ul>
    </section>

    <!-- The playlist -->
    <section class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold">{{ t('playlist.listTitle', { n: playlistNums.length }) }}</h2>
        <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="rebuild">{{ t('playlist.regenerate') }}</button>
      </div>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="b in breakdown.filter(x => x.count > 0)"
          :key="b.part"
          class="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200"
        >Part {{ b.part }} × {{ b.count }}</span>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ t('playlist.listSub') }}</p>
      <button
        class="mt-4 w-full text-sm font-semibold px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
        :disabled="playlistNums.length === 0"
        @click="startPractice"
      >
        {{ t('playlist.start') }}
      </button>
    </section>
  </div>
</template>
