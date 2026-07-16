export default {
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        debugPanel: 'debug-panel.html',
        rendererInfo: 'renderer-info.html',
        helperToggle: 'helper-toggle.html',
        minimalRepro: 'minimal-repro.html'
      }
    }
  }
};
