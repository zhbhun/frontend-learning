<script lang="ts" setup>
import { useRouter } from "vue-router";
import { firebaseAuth } from "../firebase";

const router = useRouter();

function logout() {
  firebaseAuth.signOut().then(() => {
    router.push("/signup");
  });
}
</script>

<template>
  <p>Welcome, <a @click="logout">logout.</a></p>
</template>
