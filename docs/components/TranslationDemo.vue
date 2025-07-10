<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getFetcher } from '../../packages/js-lib/src/http'
import { FetchTranslationLoader, TranslationService } from '../../packages/js-lib/src/browser'

const translationService = ref(
  new TranslationService({
    defaultLocale: 'en',
    currentLocale: 'en',
    supportedLocales: ['en', 'ru'],
    translationLoader: new FetchTranslationLoader(
      getFetcher({
        baseUrl: 'lang',
      }),
    ),
  }),
)

// const tr = (key: string): string => translationService.translate(key)

const loading = ref(true)

const tr1 = computed(() => translationService.value.translate('key1'))
const tr2 = computed(() => translationService.value.translate('key2'))

onMounted(async () => {
  await translationService.value.loadLocale(['en', 'ru'])

  loading.value = false
})
</script>

<template>
  <div class="app-content">
    <div v-if="loading">Loading...</div>
    <pre v-else>
translationService.currentLocale == <button
      v-for="locale of translationService.cfg.supportedLocales"
      :disabled="translationService.currentLocale === locale"
      @click="translationService.currentLocale = locale">{{ locale }}</button>
key1: "{{ tr1 }}"
key2: "{{ tr2 }}"

translationService.locales: {{ translationService.locales }}
</pre>
  </div>
</template>

<style>
@import '/custom.css';
</style>
