export default {
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        axesHelper: 'axes-helper.html',
        gridHelper: 'grid-helper.html',
        boxHelper: 'box-helper.html',
        cameraHelper: 'camera-helper.html',
        directionalLightHelper: 'directional-light-helper.html'
      }
    }
  }
};
