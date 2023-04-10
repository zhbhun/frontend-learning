<script lang="ts" setup>
import { onUnmounted, reactive } from "vue";
import { RouterView, useRouter } from "vue-router";
import { User } from "firebase/auth";
import { firebaseAuth } from "./firebase";

const router = useRouter();

const state = reactive({
  loading: true,
  user: null as User | null,
});

const offAuthStateChanged = firebaseAuth.onAuthStateChanged(function (user) {
  if (!user) {
    router.replace("/signup");
  }

  state.loading = false;
  state.user = user;
});

onUnmounted(() => {
  offAuthStateChanged();
});
</script>

<template>
  <RouterView v-if="!state.loading" />
</template>
