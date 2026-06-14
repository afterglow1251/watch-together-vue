<script setup lang="ts">
import { useConfirmStore } from "../stores/confirm"

const store = useConfirmStore()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.options"
      class="fixed inset-0 z-[100] flex items-center justify-center"
      @keydown.escape="store.handleCancel"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/30" @click="store.handleCancel" />

      <!-- Dialog -->
      <div
        class="relative bg-card border border-border rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-5 max-w-[360px] w-[calc(100%-32px)]"
        style="animation: msg-in 0.15s ease-out"
      >
        <h3 class="text-sm font-semibold text-text mb-1.5">{{ store.options.title }}</h3>
        <p class="text-[13px] text-muted mb-5 leading-relaxed">{{ store.options.message }}</p>

        <div class="flex gap-2 justify-end">
          <button
            class="px-3.5 py-2 rounded-lg border border-border bg-transparent text-[13px] text-text cursor-pointer transition-colors hover:bg-hover"
            @click="store.handleCancel"
          >
            {{ store.options.cancelText ?? "Cancel" }}
          </button>
          <button
            autofocus
            class="px-3.5 py-2 rounded-lg border-none text-[13px] text-white font-medium cursor-pointer transition-colors"
            :class="store.options.danger ? 'bg-danger hover:brightness-110' : 'bg-accent hover:bg-accent-dark'"
            @click="store.handleConfirm"
          >
            {{ store.options.confirmText ?? "Confirm" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
