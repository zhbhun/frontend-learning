const baseUrl = import.meta.env.BASE_URL;

export const MODEL_ASSETS = {
  glb: {
    label: 'Box.glb',
    url: `${baseUrl}models/box/glTF-Binary/Box.glb`,
    note: '单文件 GLB，部署时不容易漏外部资源。'
  },
  gltf: {
    label: 'Box.gltf + Box0.bin',
    url: `${baseUrl}models/box/gltf/Box.gltf`,
    note: 'JSON 主文件会继续请求同目录的 Box0.bin。'
  },
  multiNode: {
    label: 'MultiNodeBox.gltf',
    url: `${baseUrl}models/box/gltf/MultiNodeBox.gltf`,
    note: '本课自定义多节点 glTF，用来观察 traverse、getObjectByName 和 Box3。'
  },
  missingTopLevel: {
    label: 'not-found.gltf',
    url: `${baseUrl}models/box/gltf/not-found.gltf`,
    note: '主文件 URL 错误，浏览器会直接请求失败。'
  },
  missingBuffer: {
    label: 'BrokenExternalBuffer.gltf',
    url: `${baseUrl}models/box/gltf/BrokenExternalBuffer.gltf`,
    note: '主文件存在，但内部 buffer URI 指向不存在的文件。'
  },
  valid: {
    label: 'Box.glb',
    url: `${baseUrl}models/box/glTF-Binary/Box.glb`,
    note: '有效的单文件 GLB，用来观察失败后恢复加载。'
  }
};
