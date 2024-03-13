import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('onNeedRefresh', updateSW);
  },
  onOfflineReady() {
    console.log('onNeedRefresh');
  },
});
