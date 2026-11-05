<script setup lang="ts">
import {
  getVolumes, deleteVolume, volumeStats,
  getDraftVolumeItems, setDraftVolumeItems, activateVolume,
  volumeQuestions, getVolume, bankViewId,
  type Volume, type DraftItem,
} from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

type Tab = 'active' | 'drafts'
const tab = ref<Tab>('active')
const stats = ref(volumeStats())
const volumes = ref<Volume[]>([])
const selectedId = ref<string | null>(null)
const volVersion = ref(0) // bump whenever volumes mutate in localStorage
const page = ref(1)
const PAGE_SIZE = 15

// Add volume (Generate by AI) modal
const showAdd = ref(false)

// Draft QC state
const draftItems = ref<DraftItem[]>([])

// Question modal
const qModal = ref<any>(null)

function refresh(): void {
  volumes.value = getVolumes()
  stats.value = volumeStats()
  volVersion.value++
}

function activeVolumes(): Volume[] {
  return volumes.value.filter(v => v.status === 'active')
}
function draftVolumes(): Volume[] {
  return volumes.value.filter(v => v.status === 'draft')
}

const selected = computed(() => {
  void volVersion.value // re-read after localStorage mutations
  return selectedId.value ? getVolume(selectedId.value) ?? null : null
})

const detailQuestions = computed(() => {
  const v = selected.value
  if (!v) return []
  if (v.status === 'draft') {
    return draftItems.value.map((it, i) => ({
      key: `d-${i}`,
      idx: i,
      id: `draft-${i + 1}`,
      stem: it.stem,
      options: it.options,
      correctLetter: it.correctLetter,
      section: `Part ${it.part}`,
      status: it.draftStatus,
      raw: it,
    }))
  }
  return volumeQuestions(v).map((q, i) => ({
    key: `${q.materialSlug}-${q.number}`,
    idx: i,
    id: bankViewId(q.materialSlug, q.number),
    ovKey: `${q.materialSlug}-${q.number}`,
    stem: q.stem,
    options: q.options,
    correctLetter: q.correctLetter,
    section: q.part > 0 ? `Part ${q.part}` : q.skill,
    bank: v.name,
    status: null as DraftItem['draftStatus'] | null,
    raw: q,
  }))
})

const totalPages = computed(() => Math.max(1, Math.ceil(detailQuestions.value.length / PAGE_SIZE)))
const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return detailQuestions.value.slice(start, start + PAGE_SIZE)
})

function openVolume(id: string): void {
  selectedId.value = id
  page.value = 1
  const v = getVolume(id)
  if (v && v.status === 'draft') draftItems.value = getDraftVolumeItems(id)
  router.push({ path: '/admin/databases', query: { volume: id } })
}

function backToList(): void {
  selectedId.value = null
  router.push({ path: '/admin/databases' })
}

function openAdd(): void {
  showAdd.value = true
}

function onVolumeCreated(id: string): void {
  refresh()
  tab.value = 'drafts'
  openVolume(id)
}

function setItemStatus(idx: number, status: 'approved' | 'rejected' | 'pending'): void {
  const v = selected.value
  if (!v) return
  const items = getDraftVolumeItems(v.id).map((it, i) => (i === idx ? { ...it, draftStatus: status } : it))
  setDraftVolumeItems(v.id, items)
  draftItems.value = items
}

function approveAllDraft(): void {
  const v = selected.value
  if (!v) return
  const items = getDraftVolumeItems(v.id).map(it => ({ ...it, draftStatus: 'approved' as const }))
  setDraftVolumeItems(v.id, items)
  draftItems.value = items
}

function activate(): void {
  const v = selected.value
  if (!v) return
  const n = activateVolume(v.id)
  refresh()
  if (n > 0) {
    tab.value = 'active'
    openVolume(v.id)
  }
}

function draftCounts(): { pending: number; approved: number; rejected: number } {
  return {
    pending: draftItems.value.filter(i => i.draftStatus === 'pending').length,
    approved: draftItems.value.filter(i => i.draftStatus === 'approved').length,
    rejected: draftItems.value.filter(i => i.draftStatus === 'rejected').length,
  }
}

function openQuestionModal(item: any): void {
  qModal.value = {
    id: item.id,
    ovKey: item.ovKey ?? null,
    bank: item.bank ?? selected.value?.name ?? '',
    section: item.section,
    stem: item.stem,
    options: item.options,
    correctLetter: item.correctLetter,
  }
}

function removeVolume(id: string): void {
  if (!confirm(t('admin.databases.confirmDelete'))) return
  deleteVolume(id)
  backToList()
  refresh()
}

onMounted(() => {
  refresh()
  const vid = route.query.volume
  if (typeof vid === 'string') {
    openVolume(vid)
    const qid = route.query.q
    if (typeof qid === 'string') {
      const found = detailQuestions.value.find(item => item.id === qid)
      if (found) openQuestionModal(found)
    }
  }
})
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.databases.heading') }}</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.databases.sub') }}</p>
      </div>
      <button
        v-if="!selected"
        class="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        @click="openAdd"
      >+ {{ t('admin.databases.addVolume') }}</button>
    </div>

    <!-- Stat cards -->
    <div v-if="!selected" class="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.databases.totalData') }}</p>
        <p class="mt-1 text-2xl font-extrabold">{{ stats.total }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.databases.catEnglish') }}</p>
        <p class="mt-1 text-2xl font-extrabold">{{ stats.byCategory.english }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.databases.catStem') }}</p>
        <p class="mt-1 text-2xl font-extrabold">{{ stats.byCategory.stem }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.databases.byVolume') }}</p>
        <ul class="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
          <li v-for="v in stats.byVolume" :key="v.id" class="text-xs flex justify-between gap-2">
            <span class="truncate">{{ v.name }}</span><span class="font-bold tabular-nums">{{ v.count }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Volume detail -->
    <template v-if="selected">
      <button class="mt-4 text-sm font-semibold text-blue-600" @click="backToList">← {{ t('admin.databases.allVolumes') }}</button>
      <div class="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <h2 class="text-lg font-extrabold">{{ selected.name }}
          <span v-if="selected.status === 'draft'" class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 align-middle">{{ t('admin.databases.draftTag') }}</span>
        </h2>
        <button class="text-xs font-semibold text-red-500 px-2 py-1" @click="removeVolume(selected.id)">{{ t('admin.databases.delete') }}</button>
      </div>

      <!-- Draft QC actions -->
      <div v-if="selected.status === 'draft'" class="mt-3 flex flex-wrap items-center gap-2">
        <button class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-600 text-white" @click="approveAllDraft">{{ t('admin.generate.approveAll') }}</button>
        <button
          class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40"
          :disabled="draftCounts().approved === 0"
          @click="activate"
        >{{ t('admin.databases.activate', { n: draftCounts().approved }) }}</button>
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ t('admin.generate.draftMeta', { pending: draftCounts().pending, approved: draftCounts().approved, rejected: draftCounts().rejected }) }}</span>
      </div>

      <div class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[640px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">#</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colStem') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.questions.colId') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in pageItems" :key="item.key" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="px-4 py-3 tabular-nums text-slate-500">{{ (page - 1) * PAGE_SIZE + item.idx + 1 }}</td>
                <td class="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-300">{{ item.stem }}</td>
                <td class="px-4 py-3 font-mono text-xs whitespace-nowrap">
                  {{ item.id }}
                  <span v-if="item.status" class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="item.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200' : item.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'">{{ t(`admin.generate.st_${item.status}`) }}</span>
                </td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <template v-if="selected.status === 'draft'">
                    <button class="text-xs font-semibold text-green-700 dark:text-green-300 px-2 py-1" @click="setItemStatus(item.idx, 'approved')">{{ t('admin.generate.approve') }}</button>
                    <button class="text-xs font-semibold text-red-600 dark:text-red-300 px-2 py-1" @click="setItemStatus(item.idx, 'rejected')">{{ t('admin.generate.reject') }}</button>
                  </template>
                  <button v-else class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openQuestionModal(item)">{{ t('admin.questions.view') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <button class="text-sm font-semibold text-blue-600 disabled:opacity-40" :disabled="page <= 1" @click="page--">← {{ t('admin.databases.prev') }}</button>
          <span class="text-xs text-slate-500">{{ t('admin.databases.pageOf', { p: page, n: totalPages }) }}</span>
          <button class="text-sm font-semibold text-blue-600 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">{{ t('admin.databases.next') }} →</button>
        </div>
      </div>
    </template>

    <!-- List + tabs -->
    <template v-else>
      <div class="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
        <button
          v-for="tb in (['active', 'drafts'] as const)" :key="tb"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          :class="tab === tb ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
          @click="tab = tb"
        >
          {{ t(`admin.databases.tab_${tb}`) }}
          <span v-if="tb === 'drafts' && draftVolumes().length" class="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{{ draftVolumes().length }}</span>
        </button>
      </div>

      <!-- Active volumes table -->
      <div v-if="tab === 'active'" class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[560px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colVolume') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colCategory') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colQuestions') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colCreated') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in activeVolumes()" :key="v.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="px-4 py-3 font-bold">{{ v.name }}</td>
                <td class="px-4 py-3"><span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">{{ t(`admin.databases.cat_${v.category}`) }}</span></td>
                <td class="px-4 py-3 tabular-nums">{{ volumeQuestions(v).length }}</td>
                <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ new Date(v.createdAt).toLocaleDateString() }}</td>
                <td class="px-4 py-3 text-right"><button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openVolume(v.id)">{{ t('admin.databases.open') }} →</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Draft volumes table -->
      <div v-else-if="tab === 'drafts'" class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <p v-if="draftVolumes().length === 0" class="p-5 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.databases.noDrafts') }}</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm min-w-[560px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colVolume') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colQuestions') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.databases.colCreated') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in draftVolumes()" :key="v.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td class="px-4 py-3 font-bold">{{ v.name }} <span class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{{ t('admin.databases.draftTag') }}</span></td>
                <td class="px-4 py-3 tabular-nums">{{ getDraftVolumeItems(v.id).length }}</td>
                <td class="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{{ new Date(v.createdAt).toLocaleDateString() }}</td>
                <td class="px-4 py-3 text-right"><button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openVolume(v.id)">{{ t('admin.databases.review') }} →</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

    <AdminAddVolumeModal :show="showAdd" @close="showAdd = false" @created="onVolumeCreated" />

    <AdminQuestionModal :question="qModal" @close="qModal = null" @saved="refresh(); qModal = null" />
  </div>
</template>
