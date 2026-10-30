<script setup lang="ts">
import { PAPERS } from '~/data/mock'

const activeTab = ref<'mine' | 'available'>('available')
const search = ref('')
const categoryFilter = ref('All')

const myPapers = computed(() => PAPERS.filter(p => p.status !== 'not-started'))

const filtered = computed(() => {
  const base = activeTab.value === 'mine' ? myPapers.value : PAPERS
  return base.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = categoryFilter.value === 'All' || p.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

const chips = ['All', 'Full Simulation', 'Drill Pack']
</script>

<template>
  <div>
    <!-- Hero band -->
    <div class="bg-blue-50 border-b border-blue-100">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <nav class="text-xs text-slate-400 mb-2">
          <NuxtLink to="/" class="hover:text-blue-600">Home</NuxtLink>
          <span class="mx-1.5">/</span>
          <span class="text-slate-600">Papers</span>
        </nav>
        <h1 class="text-2xl font-extrabold text-slate-800">Test Papers</h1>
        <p class="mt-1 text-sm text-slate-500">Pick a paper, take the test, and get your predicted score instantly.</p>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-6">
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-slate-200">
        <button
          class="relative px-4 py-3 text-sm font-semibold"
          :class="activeTab === 'mine' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'mine'"
        >
          My Papers
          <span class="ml-1.5 text-xs px-2 py-0.5 rounded-full" :class="activeTab === 'mine' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">{{ myPapers.length }}</span>
          <span v-if="activeTab === 'mine'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
        </button>
        <button
          class="relative px-4 py-3 text-sm font-semibold"
          :class="activeTab === 'available' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'"
          @click="activeTab = 'available'"
        >
          Available Papers
          <span class="ml-1.5 text-xs px-2 py-0.5 rounded-full" :class="activeTab === 'available' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'">{{ PAPERS.length }}</span>
          <span v-if="activeTab === 'available'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
        </button>
      </div>

      <!-- Filters -->
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          v-for="chip in chips"
          :key="chip"
          class="text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors"
          :class="categoryFilter === chip ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'"
          @click="categoryFilter = chip"
        >
          {{ chip }}
        </button>
        <div class="relative ml-auto w-full sm:w-64">
          <input
            v-model="search"
            type="search"
            placeholder="Search papers…"
            class="w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path stroke-linecap="round" d="M20 20l-3.5-3.5" />
          </svg>
        </div>
      </div>

      <!-- Grid -->
      <div v-if="filtered.length" class="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PaperCard v-for="p in filtered" :key="p.id" :paper="p" />
      </div>
      <div v-else class="mt-5 text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-300">
        No papers match your filters.
      </div>
    </div>
  </div>
</template>
