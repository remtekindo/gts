<script setup lang="ts">
import { QUESTIONS, FREE_TEST_QUESTIONS } from '~/data/mock'
import { getDifficultyOverrides, setDifficulty, type AdminQuestionView, type DifficultyLevel } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const search = ref('')
const selected = ref<AdminQuestionView | null>(null)
const difficulties = ref<Record<string, DifficultyLevel>>(getDifficultyOverrides())
const savedFlash = ref(false)
const selectedLevel = ref<DifficultyLevel | null>(null)

const banks = computed(() => {
  const lr = QUESTIONS.length
  const free = FREE_TEST_QUESTIONS.length
  const d = difficulties.value
  const rated = (prefix: string) => Object.keys(d).filter(k => k.startsWith(prefix)).length
  return [
    { id: 'lr' as const, name: 'TOEIC LR', total: lr, rated: rated('lr-') },
    { id: 'free' as const, name: 'Free Test', total: free, rated: rated('free-') },
  ]
})

const activeBank = computed(() => {
  const b = route.query.bank
  return b === 'lr' || b === 'free' ? b : null
})

const allQuestions = computed<AdminQuestionView[]>(() => [
  ...QUESTIONS.map(q => ({
    id: `lr-${q.number}`,
    bank: 'TOEIC LR',
    section: `Part ${q.part}`,
    stem: q.stem,
    options: q.options.map(o => ({ letter: o.letter, text: o.text })),
    correctLetter: q.correctLetter,
  })),
  ...FREE_TEST_QUESTIONS.map(q => ({
    id: `free-${q.number}`,
    bank: 'Free Test',
    section: q.section.charAt(0).toUpperCase() + q.section.slice(1),
    stem: q.stem,
    options: q.options.map(o => ({ letter: o.letter, text: o.text })),
    correctLetter: q.correctLetter,
  })),
])

const filtered = computed(() => {
  const s = search.value.trim().toLowerCase()
  return allQuestions.value.filter(q => {
    if (activeBank.value === 'lr' && !q.id.startsWith('lr-')) return false
    if (activeBank.value === 'free' && !q.id.startsWith('free-')) return false
    if (s && !q.stem.toLowerCase().includes(s) && !q.id.includes(s)) return false
    return true
  })
})

function openBank(id: 'lr' | 'free'): void {
  router.push({ path: '/admin/questions', query: { bank: id } })
}

function backToBanks(): void {
  search.value = ''
  router.push({ path: '/admin/questions' })
}

function difficultyOf(id: string): DifficultyLevel | null {
  return difficulties.value[id] ?? null
}

function saveDifficulty(): void {
  if (!selected.value || selectedLevel.value === null) return
  setDifficulty(selected.value.id, selectedLevel.value)
  difficulties.value = getDifficultyOverrides()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 1500)
}

function openDetail(q: AdminQuestionView): void {
  selected.value = q
  selectedLevel.value = difficultyOf(q.id)
  savedFlash.value = false
}

onMounted(() => {
  const qid = route.query.q
  if (typeof qid === 'string') {
    const found = allQuestions.value.find(q => q.id === qid)
    if (found) openDetail(found)
  }
})
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.questions.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.questions.sub') }}</p>

    <!-- Bank picker: choose a material first -->
    <div v-if="!activeBank" class="mt-5 grid sm:grid-cols-2 gap-3 md:gap-4">
      <button
        v-for="b in banks"
        :key="b.id"
        class="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-blue-400 transition-colors"
        @click="openBank(b.id)"
      >
        <p class="font-bold">{{ b.name }}</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.questions.bankMeta', { total: b.total, rated: b.rated }) }}</p>
        <p class="mt-3 text-sm font-semibold text-blue-600">{{ t('admin.questions.openBank') }} →</p>
      </button>
    </div>

    <!-- Question list inside a bank -->
    <template v-else>
      <button class="mt-4 text-sm font-semibold text-blue-600" @click="backToBanks">← {{ t('admin.questions.allBanks') }}</button>
      <div class="mt-3">
        <input
          v-model="search"
          type="search"
          :placeholder="t('admin.questions.search')"
          class="w-full text-sm px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-blue-500"
        />
      </div>

      <div class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[640px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colId') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colSection') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colStem') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colDifficulty') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in filtered" :key="q.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">{{ q.id }}</td>
                <td class="px-4 py-3 whitespace-nowrap"><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{{ q.section }}</span></td>
                <td class="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-300">{{ q.stem }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span v-if="difficultyOf(q.id)" class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">L{{ difficultyOf(q.id) }}</span>
                  <span v-else class="text-xs text-slate-400 dark:text-slate-500">{{ t('admin.questions.unrated') }}</span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openDetail(q)">{{ t('admin.questions.view') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Detail modal -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/60" @click="selected = null" />
      <div class="relative bg-white dark:bg-slate-900 w-full sm:rounded-2xl sm:max-w-2xl max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-mono text-xs text-slate-400">{{ selected.id }} · {{ selected.bank }} · {{ selected.section }}</p>
            <h2 class="mt-1 font-bold">{{ t('admin.questions.detailTitle') }}</h2>
          </div>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="selected = null" aria-label="Close">✕</button>
        </div>
        <p class="mt-3 text-sm">{{ selected.stem }}</p>
        <ul class="mt-3 space-y-1.5">
          <li
            v-for="o in selected.options"
            :key="o.letter"
            class="text-sm px-3 py-2 rounded-xl border"
            :class="o.letter === selected.correctLetter ? 'border-green-500 bg-green-50 dark:bg-green-950/40 font-semibold' : 'border-slate-200 dark:border-slate-700'"
          >
            <span class="font-bold mr-2">{{ o.letter }}.</span>{{ o.text }}
            <span v-if="o.letter === selected.correctLetter" class="ml-2 text-xs font-bold text-green-700 dark:text-green-300">✓ {{ t('admin.questions.correctAnswer') }}</span>
          </li>
        </ul>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold">{{ t('admin.questions.setDifficulty') }}</span>
          <div class="flex gap-1">
            <button
              v-for="n in [1, 2, 3, 4, 5]"
              :key="n"
              class="w-9 h-9 rounded-full text-sm font-bold border transition-colors"
              :class="selectedLevel === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'"
              @click="selectedLevel = n as DifficultyLevel"
            >{{ n }}</button>
          </div>
          <button
            class="text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40"
            :disabled="selectedLevel === null"
            @click="saveDifficulty"
          >{{ t('admin.questions.save') }}</button>
          <span v-if="savedFlash" class="text-xs font-semibold text-green-600">{{ t('admin.questions.saved') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
