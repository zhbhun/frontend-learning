import { createApp } from "vue";
import "./firebase";
import "./style.css";
import router from "./router";
import App from "./App.vue";

const app = createApp(App);
app.use(router);
app.mount("#app");
