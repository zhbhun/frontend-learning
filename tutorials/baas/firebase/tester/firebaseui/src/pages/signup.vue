<script lang="ts" setup>
import { onMounted } from "vue";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
} from "firebase/auth";
import * as firebaseui from "firebaseui";
import { firebaseAuth } from "../firebase";
import "firebaseui/dist/firebaseui.css";

onMounted(() => {
  firebaseAuth.languageCode = "zh-CN";
  const ui = new firebaseui.auth.AuthUI(firebaseAuth);

  ui.disableAutoSignIn();

  ui.start("#signup", {
    signInSuccessUrl: "/welcome",
    signInOptions: [
      EmailAuthProvider.PROVIDER_ID,
      // PhoneAuthProvider.PROVIDER_ID,
      {
        provider: GoogleAuthProvider.PROVIDER_ID,
        clientId:
          "207561346082-5dlu3sb3lrvjojp8armvlsvcm9bnvjbe.apps.googleusercontent.com",
      },
    ],
    signInFlow: "popup",
    credentialHelper: firebaseui.auth.CredentialHelper.GOOGLE_YOLO,
    // Other config options...
  });
});
</script>

<template>
  <div id="signup"></div>
</template>
