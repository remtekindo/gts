<script setup lang="ts">
definePageMeta({ layout: 'material' })
interface Entry {
  rank: number
  name: string
  streak: string
  points: number
}

// Demo-only leaderboard rows with masked names.
const entries: Entry[] = [
  { rank: 1, name: 'R***a', streak: '21d', points: 4820 },
  { rank: 2, name: 'D***i', streak: '18d', points: 4510 },
  { rank: 3, name: 'S***h', streak: '15d', points: 4230 },
  { rank: 4, name: 'M***a', streak: '12d', points: 3980 },
  { rank: 5, name: 'A***l', streak: '11d', points: 3745 },
  { rank: 6, name: 'N***a', streak: '9d', points: 3410 },
  { rank: 7, name: 'F***r', streak: '8d', points: 3120 },
  { rank: 8, name: 'T***o', streak: '7d', points: 2890 }
]

function rankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400 text-amber-950'
  if (rank === 2) return 'bg-slate-300 text-slate-700'
  if (rank === 3) return 'bg-orange-300 text-orange-900'
  return 'bg-slate-100 text-slate-500'
}
</script>

<template>
  <div class="pb-28">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <h1 class="text-2xl font-extrabold">Leaderboard</h1>
      <p class="mt-1 text-sm text-blue-200">Top learners this month — streaks and points reset monthly.</p>
    </div>

    <div class="mt-5 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      <div v-for="e in entries" :key="e.rank" class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
        <span
          class="w-9 h-9 shrink-0 rounded-full text-sm font-extrabold flex items-center justify-center"
          :class="rankClass(e.rank)"
        >
          {{ e.rank }}
        </span>
        <span class="w-10 h-10 shrink-0 rounded-full bg-slate-200 text-slate-500 text-sm font-bold flex items-center justify-center">
          {{ e.name.charAt(0) }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-slate-800">{{ e.name }}</p>
          <p class="text-xs text-slate-400">🔥 {{ e.streak }} streak</p>
        </div>
        <p class="text-sm font-extrabold text-slate-800 tabular-nums">{{ e.points.toLocaleString('en-US') }} <span class="font-medium text-slate-400">pts</span></p>
      </div>
    </div>

    <!-- Sticky personal ranking -->
    <div class="fixed bottom-0 inset-x-0 z-40">
      <div class="max-w-6xl mx-auto px-4 pb-4">
        <div class="bg-slate-900 text-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-4">
          <span class="text-xs font-bold uppercase tracking-widest text-slate-400">Your Ranking</span>
          <span class="w-9 h-9 rounded-full bg-blue-600 text-sm font-extrabold flex items-center justify-center">#42</span>
          <div class="flex-1">
            <p class="text-sm font-semibold">Keep climbing — 130 points to #41</p>
            <p class="text-xs text-slate-400">🔥 6d streak · 1,250 pts this month</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
