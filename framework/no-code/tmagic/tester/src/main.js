import { createApp } from "vue";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import MagicEditor from "@tmagic/editor";
import MagicForm from "@tmagic/form";
import "element-plus/dist/index.css";
import "@tmagic/editor/dist/style.css";
import "@tmagic/form/dist/style.css";

import App from "./App.vue";

createApp(App)
  .use(ElementPlus, {
    locale: zhCn,
  })
  .use(MagicEditor)
  .use(MagicForm)
  .mount("#app");
