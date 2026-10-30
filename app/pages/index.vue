<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { postLoginPath } from '~/utils/navigation'

definePageMeta({ layout: false })

const signedIn = ref(false)
const dashboardTo = ref('/auth')

onMounted(() => {
  signedIn.value = !!getAuth()
  if (signedIn.value) dashboardTo.value = postLoginPath()
})

const owned = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const comingSoon = computed(() => MATERIALS.filter(m => m.status === 'coming-soon'))

const plans = [
  {
    name: 'Monthly',
    price: 'Rp75rb',
    anchor: 'Rp100rb',
    per: '/month',
    features: ['All papers in your materials', 'Instant predicted scores', 'Per-part breakdowns', '7-day free trial'],
    cta: 'Start free trial',
    highlight: false
  },
  {
    name: 'Quarterly',
    price: 'Rp199rb',
    anchor: 'Rp300rb',
    per: '/3 months',
    features: ['Everything in Monthly', 'New papers every month', 'Priority support'],
    cta: 'Choose Quarterly',
    highlight: true
  },
  {
    name: 'Semiannual',
    price: 'Rp349rb',
    anchor: 'Rp600rb',
    per: '/6 months',
    features: ['Everything in Quarterly', 'Lowest price per month', 'Early access to new materials'],
    cta: 'Choose Semiannual',
    highlight: false
  }
]

const steps = [
  { n: '1', title: 'Pick your material', text: 'Choose the test you are preparing for — TOEIC today, TOEFL and IELTS soon.' },
  { n: '2', title: 'Take a timed test', text: 'Real test conditions: countdown timer, per-part instructions, and a question palette.' },
  { n: '3', title: 'Know your score', text: 'Get an instant predicted score with CEFR level and see exactly which parts to fix.' }
]
</script>

<template>
  <div class="min-h-screen bg-white text-slate-800 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <span class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
          <span class="text-sm font-semibold leading-tight">Global Testing<br />System</span>
        </span>
        <nav class="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-slate-500">
          <a href="#materials" class="hover:text-slate-900">Materials</a>
          <a href="#how" class="hover:text-slate-900">How it works</a>
          <a href="#pricing" class="hover:text-slate-900">Pricing</a>
        </nav>
        <div class="ml-auto flex items-center gap-3">
          <NuxtLink
            v-if="signedIn"
            :to="dashboardTo"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Open dashboard
          </NuxtLink>
          <NuxtLink
            v-else
            to="/auth"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Sign in
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white pointer-events-none" />
      <div class="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <span class="inline-flex text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-800">
          TOEIC-first · TOEFL &amp; IELTS coming soon
        </span>
        <h1 class="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          Know your level.<br />Own your score.
        </h1>
        <p class="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
          GTS is an assessment-first test platform. No theory lessons — take a timed test,
          get an instant predicted score with CEFR level, and see exactly what to fix.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink
            :to="signedIn ? dashboardTo : '/auth'"
            class="text-sm font-semibold px-7 py-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ signedIn ? 'Continue learning' : 'Start free daily test' }}
          </NuxtLink>
          <a
            href="#materials"
            class="text-sm font-semibold px-7 py-3.5 rounded-xl border border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            See materials
          </a>
        </div>
        <p class="mt-4 text-xs text-slate-400">Free daily 10-question mini-test · No credit card required</p>
      </div>
    </section>

    <!-- Materials -->
    <section id="materials" class="max-w-6xl mx-auto px-4 py-16 w-full">
      <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 text-center">Test materials</h2>
      <p class="mt-3 text-slate-500 text-center max-w-xl mx-auto">One subscription, focused test prep per material. New papers ship every month.</p>
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <div
          v-for="m in owned"
          :key="m.slug"
          class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <span class="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">Available now</span>
          </div>
          <h3 class="mt-4 text-lg font-bold text-slate-900">{{ m.name }}</h3>
          <p class="mt-1 text-sm text-slate-500">{{ m.description }}</p>
        </div>
        <div
          v-for="m in comingSoon"
          :key="m.slug"
          class="rounded-2xl border border-dashed border-slate-300 p-6 opacity-80"
        >
          <div class="flex items-start justify-between">
            <span class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Coming soon</span>
          </div>
          <h3 class="mt-4 text-lg font-bold text-slate-700">{{ m.name }}</h3>
          <p class="mt-1 text-sm text-slate-400">{{ m.description }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="bg-slate-50 border-y border-slate-200">
      <div class="max-w-6xl mx-auto px-4 py-16">
        <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 text-center">How it works</h2>
        <div class="mt-10 grid gap-5 md:grid-cols-3">
          <div v-for="s in steps" :key="s.n" class="bg-white rounded-2xl border border-slate-200 p-6">
            <span class="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center">{{ s.n }}</span>
            <h3 class="mt-4 font-bold text-slate-900">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm text-slate-500">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="max-w-6xl mx-auto px-4 py-16 w-full">
      <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 text-center">Simple pricing</h2>
      <p class="mt-3 text-slate-500 text-center">Pay for tests and scores, not theory. Cancel anytime.</p>
      <div class="mt-10 grid gap-5 md:grid-cols-3">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="rounded-2xl border p-6 flex flex-col"
          :class="plan.highlight ? 'border-blue-600 shadow-lg ring-1 ring-blue-600' : 'border-slate-200'"
        >
          <h3 class="font-bold text-slate-900">{{ plan.name }}</h3>
          <p class="mt-3">
            <span class="text-sm text-slate-400 line-through mr-2">{{ plan.anchor }}</span>
            <span class="text-3xl font-extrabold text-slate-900">{{ plan.price }}</span>
            <span class="text-sm text-slate-500">{{ plan.per }}</span>
          </p>
          <ul class="mt-5 space-y-2.5 text-sm text-slate-600 flex-1">
            <li v-for="f in plan.features" :key="f" class="flex gap-2">
              <span class="text-emerald-500 font-bold">✓</span> {{ f }}
            </li>
          </ul>
          <NuxtLink
            to="/auth"
            class="mt-6 text-center text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
            :class="plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 hover:border-blue-400 hover:text-blue-600'"
          >
            {{ plan.cta }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-6xl mx-auto px-4 pb-16 w-full">
      <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-10 md:p-14 text-center text-white">
        <h2 class="text-2xl md:text-3xl font-extrabold">Find out your level today.</h2>
        <p class="mt-3 text-blue-200">Take the free daily mini-test — 10 questions, instant score, no sign-up walls.</p>
        <NuxtLink
          :to="signedIn ? dashboardTo : '/auth'"
          class="mt-6 inline-block text-sm font-semibold px-7 py-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors"
        >
          {{ signedIn ? 'Open dashboard' : 'Start now — it’s free' }}
        </NuxtLink>
      </div>
    </section>

    <AppFooter />
  </div>
</template>
