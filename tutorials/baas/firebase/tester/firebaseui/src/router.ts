import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/welcome", component: () => import("./pages/welcome.vue") },
    { path: "/signup", component: () => import("./pages/signup.vue") },
  ],
});

export default router;
