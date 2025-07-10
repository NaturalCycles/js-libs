<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { ImageFitter, FitImage } from '../../packages/js-lib/src/browser'
import { _deepCopy } from '../../packages/js-lib/src/object'
import { StringMap } from '../../packages/js-lib/src/types'

const imageIds = [
  'a8ZYS21_Toc',
  'rpxnS9CtEDw',
  'Ck-qAr0qbAI',
  'h5UOgcq1Dkw',
  'Jwhzumwgq9Q',
  '2aLB0aQI5v4',
  '0Q_XPEm2oVQ',
  'bz0H2d753_U',
  'oSIl84tpYYY',
  'cX0Yxw38cx8',
  'Y6Oi_1aGKPg',
  'AqGhEk1khbE',
  'XDvvt_IEH_w',
  'leSvrOiu-nE',
  'lkeBDBTwjWQ',
  '6tJ50mdoyY4',
  'wqJW5B9Q05I',
  'Q2xGYGSu0Qo',
  'Ai-AnKx5bSM',
  'O4TA_kXW9as',
  'aV31XuctrM8',
  'zwoYd0ZiBmc',
  'vMGM9Y48eIY',
]

const maxHeight = ref(300)
const margin = ref(8)
const images = ref<FitImage[]>([])
const fitter = ref<ImageFitter | undefined>()

onMounted(async () => {
  // Preload images
  const map: StringMap<FitImage> = {}

  await new Promise(resolve => {
    imageIds.forEach(id => {
      const img = new Image()

      img.onload = () => {
        const { width, height, src } = img
        map[id] = {
          src,
          aspectRatio: width / height,
        }

        if (Object.keys(map).length === imageIds.length) resolve()
      }

      img.src = `https://source.unsplash.com/${id}`
    })
  })

  images.value = imageIds.map(id => map[id]!)

  update()
})

onUnmounted(() => {
  fitter.value?.stop()
})

watch(() => margin.value + maxHeight.value, update)

function update() {
  // console.log('update!')
  const containerElement = document.getElementById('imagesContainer')!

  fitter.value?.stop()

  fitter.value = new ImageFitter({
    containerElement,
    images: images.value,
    maxHeight: maxHeight.value,
    margin: margin.value,
    onChange: newImages => {
      images.value = _deepCopy(newImages)
    },
  })
}
</script>

<template>
  <div class="app-content">
    <p>
      <span class="label">maxHeight: {{ maxHeight }}</span>
      <input type="range" min="10" max="400" step="10" v-model="maxHeight" /><br />
      <span class="label">margin: {{ margin }}</span>
      <input type="range" min="0" max="20" v-model="margin" /><br />
    </p>

    <p v-if="!images.length">Loading images...</p>

    <div id="imagesContainer" :style="{ margin: `-${margin / 2}px` }">
      <img
        v-for="im in images"
        :style="{
          width: `${im.fitWidth}px`,
          height: `${im.fitHeight}px`,
          margin: `${margin / 2}px`,
        }"
        :src="im.src"
        alt="img"
      />
    </div>
  </div>
</template>

<style>
#imagesContainer {
  line-height: 0;
  border: 1px solid #888;
}

#imagesContainer img {
  margin: 4px;
  display: inline-block;
}

.label {
  display: inline-block;
  width: 160px;
}

input {
  width: 300px;
}
</style>
