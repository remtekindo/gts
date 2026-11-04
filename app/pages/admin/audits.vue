<script setup lang="ts">
import { getVolumes, allManagedUsers, type Volume } from '~/utils/admin'
import {
  answerPrompt, getAudits, getAuditById,
  getChatSessions, saveChatSession, deleteChatSession, newSessionId,
  type ChatMsg, type ChatSession, type AuditReport,
} from '~/utils/ai-assistant'

definePageMeta({ layout: 'admin' })

const { t, locale } = useLocale()

type Tab = 'chat' | 'history'
const tab = ref<Tab>('chat')

const messages = ref<ChatMsg[]>([])
const sessionId = ref<string | null>(null)
const sessions = ref<ChatSession[]>([])
const reports = ref<AuditReport[]>([])
const input = ref('')
const chatBox = ref<HTMLElement | null>(null)
const ta = ref<HTMLTextAreaElement | null>(null)

const showVolumeModal = ref(false)
const showUserModal = ref(false)
const showAddVolume = ref(false)
const reportDetail = ref<AuditReport | null>(null)

const volumes = ref<Volume[]>([])
const users = computed(() => allManagedUsers())

function lang(): 'id' | 'en' {
  return locale.value === 'id' ? 'id' : 'en'
}

function refreshLists(): void {
  sessions.value = getChatSessions()
  reports.value = getAudits()
}

function scopeForVolume(v: Volume): Set<string> {
  const ids = new Set<string>()
  for (const q of v.questions) {
    ids.add(q.scope === 'free' ? `free-${q.number}` : `lr-${q.number}`)
  }
  return ids
}

function detectVolumeScope(text: string): Set<string> | undefined {
  const low = text.toLowerCase()
  const hit = volumes.value.find(v => v.status === 'active' && low.includes(v.name.toLowerCase()))
  if (!hit) return undefined
  return scopeForVolume(hit)
}

function persist(): void {
  if (!sessionId.value) {
    sessionId.value = newSessionId()
  }
  const firstUser = messages.value.find(m => m.from === 'user')
  const now = new Date().toISOString()
  const prev = getChatSessions().find(s => s.id === sessionId.value)
  saveChatSession({
    id: sessionId.value,
    title: (firstUser?.text ?? t('admin.audits.newChat')).slice(0, 42),
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    messages: messages.value,
  })
  refreshLists()
}

async function send(): Promise<void> {
  const text = input.value.trim()
  if (!text) return
  messages.value.push({ from: 'user', text })
  input.value = ''
  autoGrow()
  const ans = answerPrompt(text, lang(), detectVolumeScope(text))
  messages.value.push({ from: 'ai', text: ans.reply, reportId: ans.reportId })
  persist()
  await nextTick()
  if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void send()
  }
}

function autoGrow(): void {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(160, el.scrollHeight) + 'px'
}

function newChat(): void {
  messages.value = []
  sessionId.value = null
  tab.value = 'chat'
}

function openSession(s: ChatSession): void {
  messages.value = [...s.messages]
  sessionId.value = s.id
  tab.value = 'chat'
  nextTick(() => {
    if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight
  })
}

function removeSession(id: string): void {
  deleteChatSession(id)
  if (sessionId.value === id) {
    messages.value = []
    sessionId.value = null
  }
  refreshLists()
}

/** Card pick -> auto text stays in the textarea AND is processed at once. */
function pickVolume(v: Volume): void {
  showVolumeModal.value = false
  input.value = `audit volume ${v.name}`
  autoGrow()
  void send()
}

function pickUser(username: string): void {
  showUserModal.value = false
  input.value = `analisa user ${username}`
  autoGrow()
  void send()
}

function viewReport(reportId: string | null | undefined): void {
  if (!reportId) return
  reportDetail.value = getAuditById(reportId) ?? null
}

function openReportFromList(id: string): void {
  reportDetail.value = getAuditById(id) ?? null
}

function onVolumeCreated(): void {
  volumes.value = getVolumes()
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

onMounted(() => {
  volumes.value = getVolumes()
  refreshLists()
  autoGrow()
})
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.audits.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.audits.sub') }}</p>

    <!-- Tabs: mobile only -->
    <div class="mt-4 md:hidden flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
      <button
        v-for="tb in (['chat', 'history'] as const)" :key="tb"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="tab === tb ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
        @click="tab = tb"
      >{{ t(`admin.audits.tab_${tb}`) }}</button>
    </div>

    <div class="mt-4 md:flex md:gap-6 md:items-start">
      <!-- Main chat column -->
      <div class="flex-1 min-w-0 flex-col" :class="tab === 'chat' ? 'flex' : 'hidden md:flex'" style="min-height: calc(100vh - 220px)">
        <div ref="chatBox" class="flex-1 overflow-y-auto py-4 space-y-6 min-h-[200px] max-h-[52vh]">
          <div v-if="messages.length === 0" class="h-full flex items-center justify-center text-center px-6 py-10">
            <div>
              <p class="text-4xl">✨</p>
              <p class="mt-3 font-bold text-slate-700 dark:text-slate-200">{{ t('admin.audits.welcome') }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">{{ t('admin.audits.welcomeSub') }}</p>
            </div>
          </div>
          <div v-for="(m, i) in messages" :key="i" class="max-w-3xl mx-auto w-full px-1">
            <div v-if="m.from === 'user'" class="flex justify-end">
              <div class="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 text-sm max-w-[85%]">
                <p class="whitespace-pre-wrap">{{ m.text }}</p>
              </div>
            </div>
            <div v-else class="flex gap-3">
              <div class="shrink-0 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm">✨</div>
              <div class="flex-1 text-sm leading-relaxed min-w-0">
                <p class="whitespace-pre-wrap text-slate-700 dark:text-slate-200">{{ m.text }}</p>
                <button
                  v-if="m.reportId"
                  class="mt-2 text-xs font-bold text-violet-700 dark:text-violet-300 underline"
                  @click="viewReport(m.reportId)"
                >{{ t('admin.audits.viewReport') }} →</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Category cards: below chat, above composer -->
        <div class="grid grid-cols-3 gap-2 md:gap-3 py-3">
          <button
            class="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg transition-all"
            @click="showVolumeModal = true"
          >
            <p class="text-xl">🔍</p>
            <p class="mt-1.5 font-bold text-xs md:text-sm">{{ t('admin.audits.cardAudit') }}</p>
            <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">{{ t('admin.audits.cardAuditSub') }}</p>
          </button>
          <button
            class="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg transition-all"
            @click="showAddVolume = true"
          >
            <p class="text-xl">➕</p>
            <p class="mt-1.5 font-bold text-xs md:text-sm">{{ t('admin.audits.cardAdd') }}</p>
            <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">{{ t('admin.audits.cardAddSub') }}</p>
          </button>
          <button
            class="text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg transition-all"
            @click="showUserModal = true"
          >
            <p class="text-xl">👤</p>
            <p class="mt-1.5 font-bold text-xs md:text-sm">{{ t('admin.audits.cardUser') }}</p>
            <p class="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">{{ t('admin.audits.cardUserSub') }}</p>
          </button>
        </div>

        <!-- Composer -->
        <div class="pb-1">
          <div class="max-w-3xl mx-auto">
            <div class="flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl p-2 shadow-sm focus-within:border-violet-500 focus-within:shadow-md transition-shadow">
              <textarea
                ref="ta"
                v-model="input"
                rows="1"
                :placeholder="t('admin.audits.composerPh')"
                class="flex-1 bg-transparent text-sm px-3 py-2 outline-none resize-none max-h-40"
                @keydown="onKeydown"
                @input="autoGrow"
              />
              <button
                class="shrink-0 w-10 h-10 rounded-xl bg-violet-600 text-white disabled:opacity-40 flex items-center justify-center"
                :disabled="!input.trim()"
                :aria-label="t('admin.aichat.send')"
                @click="send"
              >↑</button>
            </div>
            <p class="mt-1.5 text-[11px] text-center text-slate-400 dark:text-slate-500">{{ t('admin.audits.composerHint') }}</p>
          </div>
        </div>
      </div>

      <!-- Right sidebar: conversation history (desktop) -->
      <aside class="hidden md:block w-72 shrink-0">
        <button
          class="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          @click="newChat"
        >+ {{ t('admin.audits.newChat') }}</button>
        <p class="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.audits.conversations') }}</p>
        <ul class="mt-2 space-y-1.5 max-h-[38vh] overflow-y-auto">
          <li v-for="s in sessions" :key="s.id">
            <div
              class="group flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left w-full transition-colors"
              :class="s.id === sessionId ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'"
            >
              <button class="flex-1 min-w-0 text-left" @click="openSession(s)">
                <p class="text-sm font-semibold truncate">{{ s.title }}</p>
                <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ fmtDate(s.updatedAt) }}</p>
              </button>
              <button class="shrink-0 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity" :aria-label="t('admin.audits.delChat')" @click="removeSession(s.id)">✕</button>
            </div>
          </li>
        </ul>
        <p v-if="sessions.length === 0" class="mt-2 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.audits.noChats') }}</p>
        <p class="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.audits.reportsTitle') }}</p>
        <ul class="mt-2 space-y-1.5 max-h-[24vh] overflow-y-auto">
          <li v-for="r in reports" :key="r.id">
            <button
              class="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 transition-colors"
              @click="openReportFromList(r.id)"
            >
              <p class="text-xs font-bold truncate">{{ r.title }}</p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate">{{ r.summary }}</p>
            </button>
          </li>
        </ul>
        <p v-if="reports.length === 0" class="mt-2 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.audits.empty') }}</p>
      </aside>

      <!-- Mobile history tab -->
      <div class="md:hidden" :class="tab === 'history' ? 'block' : 'hidden'">
        <button
          class="w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white"
          @click="newChat"
        >+ {{ t('admin.audits.newChat') }}</button>
        <p class="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.audits.conversations') }}</p>
        <ul class="mt-2 space-y-1.5">
          <li v-for="s in sessions" :key="s.id">
            <button
              class="w-full text-left px-3 py-2.5 rounded-xl border transition-colors"
              :class="s.id === sessionId ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-950/40' : 'border-slate-200 dark:border-slate-700'"
              @click="openSession(s)"
            >
              <p class="text-sm font-semibold truncate">{{ s.title }}</p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ fmtDate(s.updatedAt) }}</p>
            </button>
          </li>
        </ul>
        <p v-if="sessions.length === 0" class="mt-2 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.audits.noChats') }}</p>
        <p class="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.audits.reportsTitle') }}</p>
        <ul class="mt-2 space-y-1.5">
          <li v-for="r in reports" :key="r.id">
            <button
              class="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
              @click="openReportFromList(r.id)"
            >
              <p class="text-xs font-bold truncate">{{ r.title }}</p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500 truncate">{{ r.summary }}</p>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Volume picker modal -->
    <div v-if="showVolumeModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md max-h-[80vh] overflow-y-auto p-5 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-bold">{{ t('admin.audits.pickVolume') }}</h2>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="showVolumeModal = false" aria-label="Close">✕</button>
        </div>
        <ul class="mt-3 space-y-2">
          <li v-for="v in volumes.filter(x => x.status === 'active')" :key="v.id">
            <button
              class="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow transition-all"
              @click="pickVolume(v)"
            >
              <p class="font-bold text-sm">{{ v.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ v.questions.length }} {{ t('admin.databases.colQuestions') }}</p>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- User picker modal -->
    <div v-if="showUserModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md max-h-[80vh] overflow-y-auto p-5 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-bold">{{ t('admin.audits.pickUser') }}</h2>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="showUserModal = false" aria-label="Close">✕</button>
        </div>
        <ul class="mt-3 space-y-2">
          <li v-for="u in users" :key="u.username">
            <button
              class="w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow transition-all flex items-center justify-between"
              @click="pickUser(u.username)"
            >
              <span class="font-bold text-sm">{{ u.username }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ u.plan }} · {{ u.attempts }} tes</span>
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Report detail modal -->
    <div v-if="reportDetail" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-lg max-h-[85vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-bold">{{ reportDetail.title }}</h2>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ new Date(reportDetail.createdAt).toLocaleString() }}</p>
          </div>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="reportDetail = null" aria-label="Close">✕</button>
        </div>
        <p class="mt-3 text-sm font-semibold">{{ reportDetail.summary }}</p>
        <ul class="mt-3 text-sm space-y-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4">
          <li v-for="(d, i) in reportDetail.details" :key="i">{{ d }}</li>
        </ul>
      </div>
    </div>

    <AdminAddVolumeModal :show="showAddVolume" @close="showAddVolume = false" @created="onVolumeCreated" />
  </div>
</template>
