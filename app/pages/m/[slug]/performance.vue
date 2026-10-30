<script setup lang="ts">
definePageMeta({ layout: 'material' })
const activeTab = ref<'insights' | 'analytics'>('insights')
const dateRange = ref('Last 30 days')
const skillFilter = ref('All skills')

const skillRows = [
  { name: 'Listening', score: '385', pct: 78 },
  { name: 'Reading', score: '410', pct: 82 }
]

const analyticsBars = [
  { name: 'Listening', pct: 78 },
  { name: 'Reading', pct: 69 },
  { name: 'Grammar', pct: 45 },
  { name: 'Vocabulary', pct: 82 },
  { name: 'Time Management', pct: 58 }
]

const legend = [
  { label: 'STRONG', range: '75–100', cls: 'bg-green-100 text-green-700 border-green-200' },
  { label: 'IMPROVING', range: '51–74', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'TO IMPROVE', range: '0–50', cls: 'bg-red-100 text-red-700 border-red-200' }
]

function barColor(pct: number): string {
  if (pct >= 75) return 'bg-green-500'
  if (pct >= 51) return 'bg-amber-400'
  return 'bg-red-500'
}

function downloadReport(): void {
  window.print()
}
</script>

<template>
  <div>
    <!-- Banner -->
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <h1 class="text-2xl font-extrabold">Performance</h1>
      <p class="mt-1 text-sm text-blue-200">See exactly where you stand — and what to fix next.</p>
    </div>

    <!-- Filter row -->
    <div class="mt-5 flex flex-wrap gap-3">
      <label class="text-sm flex items-center gap-2">
        <span class="text-slate-500 font-medium">Period</span>
        <select v-model="dateRange" class="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
        </select>
      </label>
      <label class="text-sm flex items-center gap-2">
        <span class="text-slate-500 font-medium">Skill</span>
        <select v-model="skillFilter" class="rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>All skills</option>
          <option>Listening</option>
          <option>Reading</option>
        </select>
      </label>
    </div>

    <!-- Tabs -->
    <div class="mt-4 flex gap-2 border-b border-slate-200">
      <button
        class="relative px-4 py-3 text-sm font-semibold"
        :class="activeTab === 'insights' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'insights'"
      >
        Quick Insights
        <span v-if="activeTab === 'insights'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
      </button>
      <button
        class="relative px-4 py-3 text-sm font-semibold"
        :class="activeTab === 'analytics' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = 'analytics'"
      >
        Full Analytics
        <span v-if="activeTab === 'analytics'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
      </button>
    </div>

    <!-- Quick insights -->
    <div v-if="activeTab === 'insights'" class="mt-5 grid md:grid-cols-2 gap-4">
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 class="font-bold text-slate-800">Skill Scores</h2>
        <ul class="mt-4 space-y-3">
          <li v-for="s in skillRows" :key="s.name">
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-slate-500 font-medium">{{ s.name }}</span>
              <strong class="text-slate-800">{{ s.score }}</strong>
            </div>
            <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-blue-600" :style="{ width: `${s.pct}%` }" />
            </div>
          </li>
        </ul>
        <div class="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 uppercase tracking-wide font-medium">Listening &amp; Reading Total</p>
            <p class="text-3xl font-extrabold text-slate-800">795</p>
          </div>
          <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">CEFR · B2</span>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
        <h2 class="font-bold text-slate-800">Skill Radar</h2>
        <svg viewBox="0 0 120 120" class="w-44 h-44 mx-auto mt-2" role="img" aria-label="Skill radar (demo placeholder)">
          <polygon points="60,15 102.8,46.1 86.5,96.4 33.5,96.4 17.2,46.1" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
          <polygon points="60,28.5 90,50.3 78.6,85.5 41.4,85.5 30,50.3" fill="rgba(37,99,235,0.18)" stroke="#2563eb" stroke-width="2" />
          <g font-size="7" fill="#94a3b8" text-anchor="middle">
            <text x="60" y="10">Listening</text>
            <text x="110" y="48">Reading</text>
            <text x="92" y="108">Grammar</text>
            <text x="28" y="108">Vocab</text>
            <text x="10" y="48">Speed</text>
          </g>
        </svg>
        <button
          class="mt-auto w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          @click="downloadReport"
        >
          Download Report
        </button>
      </div>
    </div>

    <!-- Full analytics -->
    <div v-else class="mt-5 bg-white rounded-2xl border border-slate-200 p-5">
      <h2 class="font-bold text-slate-800">Skill Breakdown</h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="l in legend"
          :key="l.label"
          class="text-[11px] font-bold px-3 py-1.5 rounded-full border"
          :class="l.cls"
        >
          {{ l.label }} · {{ l.range }}
        </span>
      </div>
      <ul class="mt-5 space-y-4">
        <li v-for="b in analyticsBars" :key="b.name">
          <div class="flex justify-between text-sm mb-1.5">
            <span class="text-slate-600 font-medium">{{ b.name }}</span>
            <strong class="text-slate-800 tabular-nums">{{ b.pct }}%</strong>
          </div>
          <div class="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="barColor(b.pct)" :style="{ width: `${b.pct}%` }" />
          </div>
        </li>
      </ul>
      <p class="mt-5 text-xs text-slate-400">Demo data — connect a real attempt to populate your analytics.</p>
    </div>
  </div>
</template>
