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
  <p>
    Welcome, <a style="color: blue; cursor: pointer" @click="logout">logout</a>.
  </p>
</template>
