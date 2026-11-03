<script setup lang="ts">
import { FREE_TEST_QUESTIONS } from '~/data/mock'
import {
  getDifficultyOverrides, setDifficulty, getDrafts, saveDraft, setDraftItemStatus,
  setAllDraftItems, approveDraftIntoBank, mockGenerateDraftItems, liveQuestionsForMaterial,
  getBankAdditions,
  type AdminQuestionView, type DifficultyLevel, type QuestionDraft, type DraftItemStatus,
} from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const tab = ref<'bank' | 'generate' | 'drafts'>('bank')
const search = ref('')
const selected = ref<AdminQuestionView | null>(null)
const difficulties = ref<Record<string, DifficultyLevel>>(getDifficultyOverrides())
const savedFlash = ref(false)
const selectedLevel = ref<DifficultyLevel | null>(null)
const drafts = ref<QuestionDraft[]>([])
const openDraftId = ref<string | null>(null)
const mergeFlash = ref('')

// Generate form
const genPart = ref(5)
const genCount = ref(5)
const genDiff = ref<DifficultyLevel>(3)
const genTopic = ref('')

function refreshDrafts(): void {
  drafts.value = getDrafts()
}

onMounted(refreshDrafts)

const bankAdditions = computed(() => getBankAdditions())

const banks = computed(() => {
  const lr = liveQuestionsForMaterial('toeic-lr').length
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

const allQuestions = computed<AdminQuestionView[]>(() => {
  const addedIds = new Set(bankAdditions.value.map(a => `lr-${a.number}`))
  return [
    ...liveQuestionsForMaterial('toeic-lr').map(q => ({
      id: `lr-${q.number}`,
      bank: 'TOEIC LR',
      section: `Part ${q.part}`,
      stem: q.stem,
      options: q.options.map(o => ({ letter: o.letter, text: o.text })),
      correctLetter: q.correctLetter,
      ai: addedIds.has(`lr-${q.number}`),
    })),
    ...FREE_TEST_QUESTIONS.map(q => ({
      id: `free-${q.number}`,
      bank: 'Free Test',
      section: q.section.charAt(0).toUpperCase() + q.section.slice(1),
      stem: q.stem,
      options: q.options.map(o => ({ letter: o.letter, text: o.text })),
      correctLetter: q.correctLetter,
      ai: false,
    })),
  ]
})

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

// ---- Generate (AI faces the admin) ----

function doGenerate(): void {
  const { draftId, items } = mockGenerateDraftItems('toeic-lr', genPart.value, Math.min(20, Math.max(1, genCount.value)), genDiff.value, genTopic.value.trim())
  saveDraft({
    id: draftId,
    materialSlug: 'toeic-lr',
    part: genPart.value,
    targetDifficulty: genDiff.value,
    topic: genTopic.value.trim(),
    createdAt: new Date().toISOString(),
    status: 'review',
    items,
  })
  refreshDrafts()
  genTopic.value = ''
  tab.value = 'drafts'
  openDraftId.value = draftId
}

function draftCounts(d: QuestionDraft): { pending: number; approved: number; rejected: number } {
  return {
    pending: d.items.filter(i => i.draftStatus === 'pending').length,
    approved: d.items.filter(i => i.draftStatus === 'approved').length,
    rejected: d.items.filter(i => i.draftStatus === 'rejected').length,
  }
}

function setItem(draftId: string, index: number, status: DraftItemStatus): void {
  setDraftItemStatus(draftId, index, status)
  refreshDrafts()
}

function approveAll(draftId: string): void {
  setAllDraftItems(draftId, 'approved')
  refreshDrafts()
}

function mergeDraft(draftId: string): void {
  const n = approveDraftIntoBank(draftId)
  difficulties.value = getDifficultyOverrides()
  refreshDrafts()
  mergeFlash.value = t('admin.generate.merged', { n })
  setTimeout(() => { mergeFlash.value = '' }, 3000)
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

    <!-- Tabs -->
    <div class="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
      <button
        v-for="tb in (['bank', 'generate', 'drafts'] as const)"
        :key="tb"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="tab === tb ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
        @click="tab = tb"
      >
        {{ t(`admin.generate.tab_${tb}`) }}
        <span v-if="tb === 'drafts' && drafts.filter(d => d.status === 'review').length" class="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{{ drafts.filter(d => d.status === 'review').length }}</span>
      </button>
    </div>

    <!-- ============ TAB: BANK ============ -->
    <template v-if="tab === 'bank'">
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
                  <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    {{ q.id }}
                    <span v-if="(q as any).ai" class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">AI</span>
                  </td>
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
    </template>

    <!-- ============ TAB: GENERATE ============ -->
    <template v-else-if="tab === 'generate'">
      <div class="mt-5 max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('admin.generate.formSub') }}</p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.part') }}</span>
            <select v-model.number="genPart" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              <option :value="5">Part 5</option>
              <option :value="6">Part 6</option>
              <option :value="7">Part 7</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.count') }}</span>
            <input v-model.number="genCount" type="number" min="1" max="20" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.difficulty') }}</span>
            <select v-model.number="genDiff" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
              <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="n">L{{ n }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.topic') }}</span>
            <input v-model="genTopic" type="text" :placeholder="t('admin.generate.topicPh')" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
        </div>
        <button class="mt-4 text-sm font-semibold px-5 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors" @click="doGenerate">
          {{ t('admin.generate.submit') }}
        </button>
        <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.generate.stubNote') }}</p>
      </div>
    </template>

    <!-- ============ TAB: DRAFTS (QC) ============ -->
    <template v-else>
      <div class="mt-5 space-y-4">
        <p v-if="mergeFlash" class="text-sm font-semibold text-green-600">{{ mergeFlash }}</p>
        <p v-if="drafts.length === 0" class="text-sm text-slate-500 dark:text-slate-400">{{ t('admin.generate.noDrafts') }}</p>
        <div v-for="d in drafts" :key="d.id" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button class="w-full text-left p-4 md:p-5 flex items-center justify-between gap-3" @click="openDraftId = openDraftId === d.id ? null : d.id">
            <div>
              <p class="font-bold text-sm">
                {{ t('admin.generate.draftTitle', { part: d.part, n: d.items.length }) }}
                <span v-if="d.status === 'merged'" class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200">{{ t('admin.generate.mergedTag') }}</span>
                <span v-else class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{{ t('admin.generate.reviewTag') }}</span>
              </p>
              <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {{ t('admin.generate.draftMeta', { pending: draftCounts(d).pending, approved: draftCounts(d).approved, rejected: draftCounts(d).rejected }) }}
              </p>
            </div>
            <span class="text-slate-400">{{ openDraftId === d.id ? '▾' : '▸' }}</span>
          </button>
          <div v-if="openDraftId === d.id" class="px-4 md:px-5 pb-5">
            <div v-if="d.status === 'review'" class="flex flex-wrap gap-2 mb-3">
              <button class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white" @click="approveAll(d.id)">{{ t('admin.generate.approveAll') }}</button>
              <button
                class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40"
                :disabled="draftCounts(d).approved === 0"
                @click="mergeDraft(d.id)"
              >{{ t('admin.generate.merge', { n: draftCounts(d).approved }) }}</button>
            </div>
            <ul class="space-y-2">
              <li v-for="(it, idx) in d.items" :key="it.draftId" class="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm flex-1">{{ it.stem }}</p>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    :class="it.draftStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200' : it.draftStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                  >{{ t(`admin.generate.st_${it.draftStatus}`) }}</span>
                </div>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ it.options.map(o => `${o.letter}. ${o.text}`).join(' · ') }}
                  <span class="font-bold text-green-700 dark:text-green-300">✓ {{ it.correctLetter }}</span>
                </p>
                <div v-if="d.status === 'review'" class="mt-2 flex gap-2">
                  <button class="text-xs font-semibold px-3 py-1 rounded-lg border border-green-500 text-green-700 dark:text-green-300" @click="setItem(d.id, idx, 'approved')">{{ t('admin.generate.approve') }}</button>
                  <button class="text-xs font-semibold px-3 py-1 rounded-lg border border-red-400 text-red-600 dark:text-red-300" @click="setItem(d.id, idx, 'rejected')">{{ t('admin.generate.reject') }}</button>
                  <button v-if="it.draftStatus !== 'pending'" class="text-xs text-slate-400 px-2 py-1" @click="setItem(d.id, idx, 'pending')">{{ t('admin.generate.undo') }}</button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <!-- Detail modal (bank tab) -->
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
