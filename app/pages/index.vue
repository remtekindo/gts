<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { postLoginPath } from '~/utils/navigation'

definePageMeta({ layout: false })

const { t } = useLocale()

const signedIn = ref(false)
const dashboardTo = ref('/auth')

onMounted(() => {
  signedIn.value = !!getAuth()
  if (signedIn.value) dashboardTo.value = postLoginPath()
})

const owned = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const comingSoon = computed(() => MATERIALS.filter(m => m.status === 'coming-soon'))

const plans = computed(() => [
  {
    name: t('landing.planMonthly'),
    price: 'Rp75rb',
    anchor: 'Rp100rb',
    per: t('landing.perMonth'),
    features: [t('landing.featM1'), t('landing.featM2'), t('landing.featM3'), t('landing.featM4')],
    cta: t('landing.ctaTrial'),
    highlight: false
  },
  {
    name: t('landing.planQuarterly'),
    price: 'Rp199rb',
    anchor: 'Rp300rb',
    per: t('landing.per3'),
    features: [t('landing.featQ1'), t('landing.featQ2'), t('landing.featQ3')],
    cta: t('landing.ctaQuarterly'),
    highlight: true
  },
  {
    name: t('landing.planSemiannual'),
    price: 'Rp349rb',
    anchor: 'Rp600rb',
    per: t('landing.per6'),
    features: [t('landing.featS1'), t('landing.featS2'), t('landing.featS3')],
    cta: t('landing.ctaSemiannual'),
    highlight: false
  }
])

const steps = computed(() => [
  { n: '1', title: t('landing.step1t'), text: t('landing.step1d') },
  { n: '2', title: t('landing.step2t'), text: t('landing.step2d') },
  { n: '3', title: t('landing.step3t'), text: t('landing.step3d') }
])
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-white dark:bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <span class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
          <span class="text-sm font-semibold leading-tight">Global Testing<br />System</span>
        </span>
        <nav class="hidden md:flex items-center gap-6 ml-6 text-sm font-medium text-slate-500 dark:text-slate-400">
          <a href="#materials" class="hover:text-slate-900 dark:hover:text-white">{{ t('nav.materials') }}</a>
          <a href="#how" class="hover:text-slate-900 dark:hover:text-white">{{ t('landing.howTitle') }}</a>
          <a href="#pricing" class="hover:text-slate-900 dark:hover:text-white">{{ t('landing.pricingTitle') }}</a>
          <NuxtLink to="/free-test" class="hover:text-slate-900 dark:hover:text-white">{{ t('nav.freeTest') }}</NuxtLink>
        </nav>
        <div class="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <NuxtLink
            v-if="signedIn"
            :to="dashboardTo"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {{ t('nav.openDashboard') }}
          </NuxtLink>
          <NuxtLink
            v-else
            to="/auth"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {{ t('nav.signIn') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-white dark:from-blue-950 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
      <div class="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <span class="inline-flex text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {{ t('landing.badge') }}
        </span>
        <h1 class="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {{ t('landing.titleA') }}<br />{{ t('landing.titleB') }}
        </h1>
        <p class="mt-5 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {{ t('landing.subtitle') }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink
            :to="signedIn ? dashboardTo : '/free-test'"
            class="text-sm font-semibold px-7 py-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ signedIn ? t('landing.continue') : t('landing.startFree') }}
          </NuxtLink>
          <a
            href="#materials"
            class="text-sm font-semibold px-7 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {{ t('landing.seeMaterials') }}
          </a>
        </div>
        <p class="mt-4 text-xs text-slate-400 dark:text-slate-500">{{ t('landing.freeNote') }}</p>
      </div>
    </section>

    <!-- Materials -->
    <section id="materials" class="max-w-6xl mx-auto px-4 py-16 w-full">
      <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center">{{ t('landing.materialsTitle') }}</h2>
      <p class="mt-3 text-slate-500 dark:text-slate-400 text-center max-w-xl mx-auto">{{ t('landing.materialsSub') }}</p>
      <div class="mt-10 grid gap-5 md:grid-cols-2">
        <div
          v-for="m in owned"
          :key="m.slug"
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <span class="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{{ t('landing.availableNow') }}</span>
          </div>
          <h3 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">{{ m.name }}</h3>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</p>
        </div>
        <div
          v-for="m in comingSoon"
          :key="m.slug"
          class="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 opacity-80"
        >
          <div class="flex items-start justify-between">
            <span class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 dark:text-slate-400 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{{ t('landing.comingSoon') }}</span>
          </div>
          <h3 class="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">{{ m.name }}</h3>
          <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ m.description }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="how" class="bg-slate-50 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 py-16">
        <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center">{{ t('landing.howTitle') }}</h2>
        <div class="mt-10 grid gap-5 md:grid-cols-3">
          <div v-for="s in steps" :key="s.n" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <span class="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center">{{ s.n }}</span>
            <h3 class="mt-4 font-bold text-slate-900 dark:text-slate-100">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ s.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="max-w-6xl mx-auto px-4 py-16 w-full">
      <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 text-center">{{ t('landing.pricingTitle') }}</h2>
      <p class="mt-3 text-slate-500 dark:text-slate-400 text-center">{{ t('landing.pricingSub') }}</p>
      <div class="mt-10 grid gap-5 md:grid-cols-3">
        <div
          v-for="plan in plans"
          :key="plan.name"
          class="rounded-2xl border p-6 flex flex-col"
          :class="plan.highlight ? 'border-blue-600 shadow-lg ring-1 ring-blue-600' : 'border-slate-200 dark:border-slate-700'"
        >
          <h3 class="font-bold text-slate-900 dark:text-slate-100">{{ plan.name }}</h3>
          <p class="mt-3">
            <span class="text-sm text-slate-400 dark:text-slate-500 line-through mr-2">{{ plan.anchor }}</span>
            <span class="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{{ plan.price }}</span>
            <span class="text-sm text-slate-500 dark:text-slate-400">{{ plan.per }}</span>
          </p>
          <ul class="mt-5 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 flex-1">
            <li v-for="f in plan.features" :key="f" class="flex gap-2">
              <span class="text-emerald-500 font-bold">✓</span> {{ f }}
            </li>
          </ul>
          <NuxtLink
            to="/auth"
            class="mt-6 text-center text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
            :class="plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600'"
          >
            {{ plan.cta }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-6xl mx-auto px-4 pb-16 w-full">
      <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-10 md:p-14 text-center text-white">
        <h2 class="text-2xl md:text-3xl font-extrabold">{{ t('landing.ctaTitle') }}</h2>
        <p class="mt-3 text-blue-200">{{ t('landing.ctaSub') }}</p>
        <NuxtLink
          :to="signedIn ? dashboardTo : '/free-test'"
          class="mt-6 inline-block text-sm font-semibold px-7 py-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 transition-colors"
        >
          {{ signedIn ? t('nav.openDashboard') : t('landing.ctaBtn') }}
        </NuxtLink>
      </div>
    </section>

    <AppFooter />
  </div>
</template>
