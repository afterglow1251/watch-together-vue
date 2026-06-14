<script setup lang="ts">
import Navbar from "./Navbar.vue"
import FloatingHearts from "./FloatingHearts.vue"
</script>

<template>
  <div class="h-screen flex flex-col bg-auth-gradient relative">
    <Navbar />
    <FloatingHearts />
    <div class="flex-1 overflow-y-auto relative z-1">
      <RouterView />
    </div>
  </div>
</template>
