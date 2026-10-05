<script setup lang="ts">
import DialogLayer from "./components/DialogLayer.vue";
import TopBar from "./components/TopBar.vue";
import WorkspaceShell from "./components/WorkspaceShell.vue";
import SourceBundleDialog from "./components/SourceBundleDialog.vue";
</script>

<template>
  <header id="topbar"><TopBar /></header>
  <WorkspaceShell />
  <DialogLayer />
  <SourceBundleDialog />
</template>
