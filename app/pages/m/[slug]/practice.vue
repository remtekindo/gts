<script setup lang="ts">
import { getMaterialOrFallback, type Question } from '~/data/mock'
import { loadPlaylist, recordPracticeAttempt } from '~/utils/adaptive'
import { getAuth } from '~/utils/storage'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const material = computed(() => getMaterialOrFallback(slug.value))
const base = computed(() => `/m/${slug.value}`)

const questions = ref<Question[]>([])
const idx = ref(0)
const picked = ref<Record<number, string>>({})
const done = ref(false)

const q = computed(() => questions.value[idx.value])
const correctCount = computed(() =>
  questions.value.filter(x => picked.value[x.number] === x.correctLetter).length
)

function choose(letter: string): void {
  if (done.value || !q.value) return
  picked.value = { ...picked.value, [q.value.number]: letter }
}

function submit(): void {
  const user = getAuth()
  questions.value.forEach(x => {
    recordPracticeAttempt(slug.value, x.number, picked.value[x.number] === x.correctLetter, user?.username)
  })
  done.value = true
}

onMounted(() => {
  questions.value = loadPlaylist(slug.value)
  if (questions.value.length === 0) router.replace(`${base.value}/playlist`)
})
</script>

<template>
  <div class="px-4 md:px-6 py-6 max-w-3xl mx-auto">
    <NuxtLink :to="`${base}/playlist`" class="text-sm font-semibold text-blue-600">← {{ t('practice.back') }}</NuxtLink>

    <template v-if="!done && q">
      <div class="mt-3 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{{ t('practice.qOf', { i: idx + 1, n: questions.length }) }} · Part {{ q.part }}</span>
        <span>{{ Object.keys(picked).length }}/{{ questions.length }} {{ t('practice.answered') }}</span>
      </div>
      <div class="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div class="h-full bg-blue-600 rounded-full transition-all" :style="{ width: ((idx + 1) / questions.length * 100) + '%' }" />
      </div>

      <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <p v-if="q.context" class="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 mb-3">{{ q.context }}</p>
        <p class="font-semibold">{{ q.stem }}</p>
        <ul class="mt-4 space-y-2">
          <li v-for="o in q.options" :key="o.letter">
            <button
              class="w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors"
              :class="picked[q.number] === o.letter
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 font-semibold'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'"
              @click="choose(o.letter)"
            >
              <span class="font-bold mr-2">{{ o.letter }}.</span>{{ o.text }}
            </button>
          </li>
        </ul>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <button
          class="text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          :disabled="idx === 0"
          @click="idx--"
        >{{ t('practice.prev') }}</button>
        <button
          v-if="idx < questions.length - 1"
          class="text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white"
          @click="idx++"
        >{{ t('practice.next') }}</button>
        <button
          v-else
          class="text-sm font-semibold px-4 py-2.5 rounded-xl bg-green-600 text-white disabled:opacity-40"
          :disabled="Object.keys(picked).length < questions.length"
          @click="submit"
        >{{ t('practice.submit') }}</button>
      </div>
    </template>

    <template v-else-if="done">
      <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('practice.score') }}</p>
        <p class="mt-1 text-4xl font-extrabold">{{ correctCount }}<span class="text-lg text-slate-400">/{{ questions.length }}</span></p>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('practice.scoreSub') }}</p>
        <div class="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          <NuxtLink :to="`${base}/playlist`" class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white">{{ t('practice.again') }}</NuxtLink>
          <NuxtLink :to="base" class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600">{{ t('practice.dashboard') }}</NuxtLink>
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <div
          v-for="x in questions"
          :key="x.number"
          class="bg-white dark:bg-slate-900 rounded-xl border p-4"
          :class="picked[x.number] === x.correctLetter ? 'border-green-300 dark:border-green-800' : 'border-red-300 dark:border-red-800'"
        >
          <p class="text-sm font-semibold">{{ x.stem }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('practice.yourAnswer') }}: <span class="font-bold">{{ picked[x.number] ?? '—' }}</span>
            · {{ t('practice.correctAnswer') }}: <span class="font-bold text-green-700 dark:text-green-300">{{ x.correctLetter }}</span>
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ x.explanation }}</p>
        </div>
      </div>
    </template>
  </div>
</template>
