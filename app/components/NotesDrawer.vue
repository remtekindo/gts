<script setup lang="ts">
const { t } = useLocale()
const props = defineProps<{
  open: boolean
  modelValue: string
}>()

const emit = defineEmits<{
  'update:open': [v: boolean]
  'update:modelValue': [v: string]
  save: []
}>()

const draft = ref(props.modelValue)

watch(
  () => props.modelValue,
  v => { draft.value = v },
  { immediate: true }
)

function close(): void {
  emit('update:open', false)
}

function save(): void {
  emit('update:modelValue', draft.value)
  emit('save')
  close()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-slate-900/40" @click="close" />
        <aside class="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-xl flex flex-col">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 class="font-bold text-slate-800 dark:text-slate-200">{{ t('take.notesTitle') }}</h3>
            <button class="text-slate-400 dark:text-slate-500 hover:text-slate-600 text-xl leading-none" aria-label="Close notes" @click="close">
              ×
            </button>
          </div>
          <div class="flex-1 p-5">
            <textarea
              v-model="draft"
              rows="14"
              :placeholder="t('take.notesPh')"
              class="w-full h-full min-h-64 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div class="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100" @click="close">
              {{ t('common.cancel') }}
            </button>
            <button class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700" @click="save">
              {{ t('take.notesSave') }}
            </button>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active aside,
.drawer-leave-active aside {
  transition: transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from aside,
.drawer-leave-to aside {
  transform: translateX(100%);
}
</style>
