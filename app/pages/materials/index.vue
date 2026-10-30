<script setup lang="ts">
import { MATERIALS, papersForMaterial } from '~/data/mock'

const router = useRouter()
const auth = ref<AuthState | null>(null)

const owned = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const comingSoon = computed(() => MATERIALS.filter(m => m.status === 'coming-soon'))

function paperCount(slug: string): number {
  return papersForMaterial(slug).length
}

onMounted(() => {
  auth.value = getAuth()
  if (!auth.value) router.replace('/login')
})
</script>

<template>
  <div class="py-8">
    <p class="text-sm text-slate-500">Welcome back, {{ auth?.username || 'Guest' }}</p>
    <h1 class="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900">My Materials</h1>
    <p class="mt-2 text-sm text-slate-500">Pick a material to continue learning. Your progress, papers, and leaderboard are kept separately per material.</p>

    <div class="mt-8 grid gap-5 md:grid-cols-2">
      <NuxtLink
        v-for="m in owned"
        :key="m.slug"
        :to="`/m/${m.slug}`"
        class="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Active</span>
        </div>
        <h2 class="mt-4 text-lg font-bold text-slate-900 group-hover:text-blue-700">{{ m.name }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ m.description }}</p>
        <div class="mt-4 flex items-center gap-4 text-xs text-slate-500">
          <span class="font-medium">{{ paperCount(m.slug) }} papers</span>
          <span v-for="c in m.credits" :key="c.label" class="font-semibold text-amber-700">{{ c.label }} · {{ c.balance }} credits</span>
        </div>
        <span class="mt-5 inline-flex text-sm font-semibold text-blue-600 group-hover:gap-2.5 gap-1.5 transition-all">
          Open material <span aria-hidden="true">→</span>
        </span>
      </NuxtLink>
    </div>

    <h2 class="mt-12 text-lg font-bold text-slate-900">Coming soon</h2>
    <p class="mt-1 text-sm text-slate-500">New materials ship regularly for subscribers.</p>
    <div class="mt-4 grid gap-5 md:grid-cols-2">
      <div
        v-for="m in comingSoon"
        :key="m.slug"
        class="bg-white rounded-2xl border border-dashed border-slate-300 p-6 opacity-80"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Coming soon</span>
        </div>
        <h3 class="mt-4 text-lg font-bold text-slate-700">{{ m.name }}</h3>
        <p class="mt-1 text-sm text-slate-400">{{ m.description }}</p>
      </div>
    </div>
  </div>
</template>
