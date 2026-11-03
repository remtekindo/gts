<script setup lang="ts">
import { answerPrompt } from '~/utils/ai-assistant'

const { t, locale } = useLocale()

interface Msg {
  from: 'user' | 'ai'
  text: string
  reportId?: string | null
}

const open = ref(false)
const input = ref('')
const messages = ref<Msg[]>([])
const greeted = ref(false)

function lang(): 'id' | 'en' {
  return locale.value === 'id' ? 'id' : 'en'
}

function toggle(): void {
  open.value = !open.value
  if (open.value && !greeted.value) {
    greeted.value = true
    messages.value.push({
      from: 'ai',
      text: t('admin.aichat.greet'),
    })
  }
}

function send(): void {
  const text = input.value.trim()
  if (!text) return
  messages.value.push({ from: 'user', text })
  input.value = ''
  const ans = answerPrompt(text, lang())
  messages.value.push({ from: 'ai', text: ans.reply, reportId: ans.reportId })
}

const scrollBox = ref<HTMLElement | null>(null)
watch(messages, async () => {
  await nextTick()
  if (scrollBox.value) scrollBox.value.scrollTop = scrollBox.value.scrollHeight
}, { deep: true })
</script>

<template>
  <div>
    <!-- Floating button -->
    <button
      class="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-violet-600 text-white text-2xl shadow-lg hover:bg-violet-700 transition-colors flex items-center justify-center"
      :aria-label="t('admin.aichat.open')"
      @click="toggle"
    >✨</button>

    <!-- Chat drawer -->
    <div
      v-if="open"
      class="fixed bottom-24 right-5 z-40 w-[calc(100vw-2.5rem)] max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="false"
    >
      <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div>
          <p class="text-sm font-bold">{{ t('admin.aichat.title') }}</p>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('admin.aichat.sub') }}</p>
        </div>
        <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="open = false" aria-label="Close">✕</button>
      </div>
      <div ref="scrollBox" class="flex-1 min-h-[200px] max-h-[50vh] overflow-y-auto p-3 space-y-2.5">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="text-sm px-3 py-2 rounded-xl max-w-[90%]"
          :class="m.from === 'user'
            ? 'ml-auto bg-blue-600 text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'"
        >
          <p class="whitespace-pre-wrap">{{ m.text }}</p>
          <NuxtLink
            v-if="m.reportId"
            to="/admin/audits"
            class="mt-1.5 inline-block text-xs font-bold text-violet-700 dark:text-violet-300 underline"
            @click="open = false"
          >{{ t('admin.aichat.viewAudit') }} →</NuxtLink>
        </div>
      </div>
      <form class="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2" @submit.prevent="send">
        <input
          v-model="input"
          type="text"
          :placeholder="t('admin.aichat.placeholder')"
          class="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          class="text-sm font-semibold px-4 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-40"
          :disabled="!input.trim()"
        >{{ t('admin.aichat.send') }}</button>
      </form>
    </div>
  </div>
</template>
