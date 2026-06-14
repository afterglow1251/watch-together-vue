<script setup lang="ts">
// 1:1 port of solid-toast's Error icon (SVG + SMIL animation):
// MainCircle pops in, the SecondaryCircle ripples out as a red wave,
// and the exclamation mark (line + dot) draws itself.
</script>

<template>
  <svg style="overflow: visible" viewBox="0 0 32 32" width="1.25rem" height="1.25rem">
    <!-- MainCircle -->
    <circle fill="#FF3B30" cx="16" cy="16" r="0">
      <animate
        attributeName="opacity"
        values="0; 1; 1"
        dur="0.35s"
        begin="100ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 0.6; 1"
        keySplines="0.25 0.71 0.4 0.88; .59 .22 .87 .63"
      />
      <animate
        attributeName="r"
        values="0; 17.5; 16"
        dur="0.35s"
        begin="100ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 0.6; 1"
        keySplines="0.25 0.71 0.4 0.88; .59 .22 .87 .63"
      />
    </circle>
    <!-- SecondaryCircle (the red wave) -->
    <circle fill="#FF3B30" cx="16" cy="16" r="12" opacity="0">
      <animate
        attributeName="opacity"
        values="1; 0"
        dur="1s"
        begin="320ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 1"
        keySplines="0.0 0.0 0.2 1"
      />
      <animate
        attributeName="r"
        values="12; 26"
        dur="1s"
        begin="320ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 1"
        keySplines="0.0 0.0 0.2 1"
      />
    </circle>
    <!-- Exclamation line -->
    <path
      fill="none"
      stroke="#FFFFFF"
      stroke-width="4"
      stroke-dasharray="9"
      stroke-dashoffset="9"
      stroke-linecap="round"
      d="M16,7l0,9"
    >
      <animate
        attributeName="stroke-dashoffset"
        values="9;0"
        dur="0.2s"
        begin="250ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 1"
        keySplines="0.0, 0.0, 0.58, 1.0"
      />
    </path>
    <!-- Exclamation dot -->
    <circle fill="#FFFFFF" cx="16" cy="23" r="2.5" opacity="0">
      <animate
        attributeName="opacity"
        values="0;1"
        dur="0.25s"
        begin="350ms"
        fill="freeze"
        calcMode="spline"
        keyTimes="0; 1"
        keySplines="0.0, 0.0, 0.58, 1.0"
      />
    </circle>
  </svg>
</template>
