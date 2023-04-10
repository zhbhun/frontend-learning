<script lang="ts" setup>
import { onMounted } from "vue";
import { EmailAuthProvider, getAuth } from "firebase/auth";
import { auth } from "firebaseui";
import "firebaseui/dist/firebaseui.css";

onMounted(() => {
  const ui = new auth.AuthUI(getAuth());

  ui.start("#signup", {
    signInSuccessUrl: "/welcome",
    signInOptions: [EmailAuthProvider.PROVIDER_ID],
    // Other config options...
  });
});
</script>

<template>
  <div id="signup"></div>
</template>
