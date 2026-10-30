<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }>(),
  { confirmText: 'Confirm', cancelText: 'Cancel', danger: false }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/50" @click="emit('cancel')" />
      <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ title }}</h3>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ message }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button
            class="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
