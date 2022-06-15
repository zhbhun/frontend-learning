import { createApp } from 'vue'
import vitedge from 'vitedge'

import App from './App.vue'

createApp(App).mount('#app')

export default vitedge(
  App,
  {
    routes: [
      {
        path: '/',
        component: () => import('./pages/a.vue'),
        name: 'a',
      },
    ],
  },
  ({ app, router, isClient, initialState }) => {
    // Custom setup hook.
    // E.g. set initialState in a store, install plugins, etc.
  }
)
