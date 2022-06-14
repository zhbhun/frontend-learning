import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/tester/a',
      component: () => import('./pages/tester/a.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  console.log(performance.now(), '>> beforeEach', to, from)
  setTimeout(() => {
    next()
  }, 3000)
})

router.beforeResolve((to, from, next) => {
  console.log(performance.now(), '>> beforeResolve', to, from)
  setTimeout(() => {
    next()
  }, 1000)
})

router.afterEach((to, from, failure) => {
  console.log(performance.now(), '>> afterEach', to, from, failure)
})

export default router
