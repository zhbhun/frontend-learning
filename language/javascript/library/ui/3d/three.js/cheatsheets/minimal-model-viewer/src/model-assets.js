const baseUrl = import.meta.env.BASE_URL;

export const MODEL_ASSETS = {
  glb: {
    label: 'Box.glb',
    url: `${baseUrl}models/box/glTF-Binary/Box.glb`,
    note: '单文件 GLB，适合作为查看器默认加载目标。'
  },
  gltf: {
    label: 'Box.gltf + Box0.bin',
    url: `${baseUrl}models/box/gltf/Box.gltf`,
    note: 'JSON 主文件会继续请求同目录的外部 buffer。'
  },
  multiNode: {
    label: 'MultiNodeBox.gltf',
    url: `${baseUrl}models/box/gltf/MultiNodeBox.gltf`,
    note: '多节点 glTF，适合观察取景、层级和自动旋转。'
  },
  missingTopLevel: {
    label: 'not-found.gltf',
    url: `${baseUrl}models/box/gltf/not-found.gltf`,
    note: '主文件 URL 不存在，适合观察顶层请求失败。'
  },
  missingBuffer: {
    label: 'BrokenExternalBuffer.gltf',
    url: `${baseUrl}models/box/gltf/BrokenExternalBuffer.gltf`,
    note: '主文件存在，但内部 buffer URI 指向不存在的文件。'
  }
};
