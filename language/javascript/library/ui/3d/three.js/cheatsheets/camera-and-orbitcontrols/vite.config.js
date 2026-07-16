export default {
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        perspective: 'perspective.html',
        orthographic: 'orthographic.html',
        orbitControls: 'orbit-controls.html'
      }
    }
  }
};
