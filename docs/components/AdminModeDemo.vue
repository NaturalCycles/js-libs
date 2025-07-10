<script setup lang="ts">
import { onMounted } from 'vue'
import { AdminService } from '../../packages/js-lib/src/browser'

const adminService = new AdminService({
  onChange: adminMode => console.log({ adminMode }),
  onRedDotClick: () => alert('RedDot clicked'),
})

onMounted(() => {
  adminService.startListening()
})
</script>
<template></template>
