export default {
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        meshParts: 'mesh-parts.html',
        replaceParts: 'replace-parts.html'
      }
    }
  }
};
