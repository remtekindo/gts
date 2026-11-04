<script setup lang="ts">
import {
  getDifficultyOverrides, setDifficulty, setQuestionOverride,
  type AdminQuestionView, type DifficultyLevel,
} from '~/utils/admin'

const props = defineProps<{ question: AdminQuestionView | null }>()
const emit = defineEmits<{ close: [], saved: [] }>()

const { t } = useLocale()

const difficulties = ref<Record<string, DifficultyLevel>>(getDifficultyOverrides())
const selectedLevel = ref<DifficultyLevel | null>(null)
const savedFlash = ref(false)
const editing = ref(false)
const editStem = ref('')
const editOptions = ref<string[]>(['', '', '', ''])
const editCorrect = ref('A')
const editSaved = ref(false)

function difficultyOf(id: string): DifficultyLevel | null {
  return difficulties.value[id] ?? null
}

watch(() => props.question, q => {
  editing.value = false
  editSaved.value = false
  savedFlash.value = false
  selectedLevel.value = q ? difficultyOf(q.id) : null
}, { immediate: true })

function saveDifficulty(): void {
  const q = props.question
  if (!q || selectedLevel.value === null) return
  setDifficulty(q.id, selectedLevel.value)
  difficulties.value = getDifficultyOverrides()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 1500)
}

function startEdit(): void {
  const q = props.question
  if (!q) return
  editing.value = true
  editSaved.value = false
  editStem.value = q.stem
  editOptions.value = q.options.map(o => o.text)
  while (editOptions.value.length < 4) editOptions.value.push('')
  editCorrect.value = q.correctLetter
  selectedLevel.value = difficultyOf(q.id)
}

function saveEdit(): void {
  const q = props.question
  if (!q || !q.ovKey) return
  const letters = ['A', 'B', 'C', 'D']
  setQuestionOverride(q.ovKey, {
    stem: editStem.value.trim(),
    options: editOptions.value.slice(0, 4).map((text, i) => ({ letter: letters[i] as string, text: text.trim() })),
    correctLetter: editCorrect.value,
  })
  if (selectedLevel.value !== null) {
    setDifficulty(q.id, selectedLevel.value)
    difficulties.value = getDifficultyOverrides()
  }
  editing.value = false
  editSaved.value = true
  emit('saved')
  setTimeout(() => { editSaved.value = false }, 2000)
}
</script>

<template>
  <div v-if="question" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
    <div class="absolute inset-0 bg-slate-900/70" @click="emit('close')" />
    <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-2xl max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="font-mono text-xs text-slate-400">{{ question.id }} · {{ question.bank }} · {{ question.section }}</p>
          <h2 class="mt-1 font-bold">{{ editing ? t('admin.questions.editTitle') : t('admin.questions.detailTitle') }}</h2>
        </div>
        <div class="flex items-center gap-1">
          <button v-if="!editing && question.ovKey" class="text-xs font-semibold text-blue-600 px-2 py-1" @click="startEdit">{{ t('admin.questions.edit') }}</button>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="emit('close')" aria-label="Close">✕</button>
        </div>
      </div>

      <template v-if="editing">
        <label class="mt-3 block">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.questions.fStem') }}</span>
          <textarea v-model="editStem" rows="3" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-blue-500" />
        </label>
        <div class="mt-3 space-y-2">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.questions.fOptions') }}</p>
          <div v-for="i in [0, 1, 2, 3]" :key="i" class="flex items-center gap-2">
            <button
              class="w-8 h-8 shrink-0 rounded-full text-xs font-bold border transition-colors"
              :class="editCorrect === 'ABCD'[i] ? 'bg-green-600 border-green-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-400'"
              :title="t('admin.questions.fCorrect')"
              @click="editCorrect = 'ABCD'[i] as string"
            >{{ 'ABCD'[i] }}</button>
            <input v-model="editOptions[i]" type="text" class="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:border-blue-500" />
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('admin.questions.fCorrectHint') }}</p>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold">{{ t('admin.questions.setDifficulty') }}</span>
          <div class="flex gap-1">
            <button
              v-for="n in [1, 2, 3, 4, 5]" :key="n"
              class="w-9 h-9 rounded-full text-sm font-bold border transition-colors"
              :class="selectedLevel === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'"
              @click="selectedLevel = n as DifficultyLevel"
            >{{ n }}</button>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          <button class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white" @click="saveEdit">{{ t('admin.questions.saveChanges') }}</button>
          <button class="text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600" @click="editing = false">{{ t('admin.questions.cancelEdit') }}</button>
        </div>
      </template>

      <template v-else>
        <p v-if="editSaved" class="mt-3 text-xs font-semibold text-green-600">{{ t('admin.questions.editSaved') }}</p>
        <p class="mt-3 text-sm">{{ question.stem }}</p>
        <ul class="mt-3 space-y-1.5">
          <li
            v-for="o in question.options" :key="o.letter"
            class="text-sm px-3 py-2 rounded-xl border"
            :class="o.letter === question.correctLetter ? 'border-green-500 bg-green-50 dark:bg-green-950/40 font-semibold' : 'border-slate-200 dark:border-slate-700'"
          >
            <span class="font-bold mr-2">{{ o.letter }}.</span>{{ o.text }}
            <span v-if="o.letter === question.correctLetter" class="ml-2 text-xs font-bold text-green-700 dark:text-green-300">✓ {{ t('admin.questions.correctAnswer') }}</span>
          </li>
        </ul>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold">{{ t('admin.questions.setDifficulty') }}</span>
          <div class="flex gap-1">
            <button
              v-for="n in [1, 2, 3, 4, 5]" :key="n"
              class="w-9 h-9 rounded-full text-sm font-bold border transition-colors"
              :class="selectedLevel === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'"
              @click="selectedLevel = n as DifficultyLevel"
            >{{ n }}</button>
          </div>
          <button class="text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white disabled:opacity-40" :disabled="selectedLevel === null" @click="saveDifficulty">{{ t('admin.questions.save') }}</button>
          <span v-if="savedFlash" class="text-xs font-semibold text-green-600">{{ t('admin.questions.saved') }}</span>
        </div>
      </template>
    </div>
  </div>
</template>
