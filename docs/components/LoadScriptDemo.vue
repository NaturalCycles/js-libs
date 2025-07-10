<script setup lang="ts">
import { ref } from 'vue'
import { _stringify } from '../../packages/js-lib/src/string'
import { loadCSS, loadScript } from '../../packages/js-lib/src/browser'

const loading = ref(false)

async function loadGood() {
  await load(`https://unpkg.com/jquery@3.6.0/dist/jquery.js`)
}

async function loadBad() {
  await load(`https://unpkg.com/jqueryNON_EXISTING`)
}

async function loadGoodCSS() {
  await loadStylesheet(`https://cdn.simplecss.org/simple.min.css`)
}

async function loadBadCSS() {
  await loadStylesheet(`https://cdn.simplecss.org/simpleNOTFOUND.min.css`)
}

async function load(src: string) {
  loading.value = true

  try {
    await loadScript(src)
    alert('loaded ok')
  } catch (err) {
    alert(_stringify(err))
  } finally {
    loading.value = false
  }
}

async function loadStylesheet(src: string) {
  loading.value = true

  try {
    await loadCSS(src)
    alert('loaded ok')
  } catch (err) {
    alert(_stringify(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="app-content">
    <button @click="loadGood">Load good script</button>
    <button @click="loadBad">Load bad script</button>
    <br /><br />
    <button @click="loadGoodCSS">Load good CSS</button>
    <button @click="loadBadCSS">Load bad CSS</button>
    <p v-if="loading">loading...</p>
  </div>
</template>

<style>
@import '/custom.css';
</style>
