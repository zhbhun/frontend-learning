import builtInSource from './built-in-geometries.js?raw';
import customSource from './custom-geometry.js?raw';
import shapeSource from './shape-geometry.js?raw';
import extrudeSource from './extrude-geometry.js?raw';
import latheSource from './lathe-geometry.js?raw';
import tubeSource from './tube-geometry.js?raw';
import textSource from './text-geometry.js?raw';
import morphSource from './morph-attributes.js?raw';
import vertexUpdateSource from './vertex-update.js?raw';
import transformSource from './geometry-transform.js?raw';

import { sceneStory } from '../../assets/story-canvas.js';
import { sceneSource } from '../../assets/story-source.js';
import {
  boxGeometryExample,
  sphereGeometryExample,
  planeGeometryExample,
  cylinderGeometryExample,
  coneGeometryExample,
  torusGeometryExample,
  capsuleGeometryExample,
  circleGeometryExample,
  ringGeometryExample,
  torusKnotGeometryExample,
  polyhedronGeometryExample
} from './built-in-geometries.js';
import { customGeometryExample } from './custom-geometry.js';
import { shapeGeometryExample } from './shape-geometry.js';
import { extrudeGeometryExample } from './extrude-geometry.js';
import { latheGeometryExample } from './lathe-geometry.js';
import { tubeGeometryExample } from './tube-geometry.js';
import { textGeometryExample } from './text-geometry.js';
import { morphAttributesExample } from './morph-attributes.js';
import { vertexUpdateExample } from './vertex-update.js';
import { geometryTransformExample } from './geometry-transform.js';

export default {
  id: 'geometry-and-buffergeometry',
  title: '核心系统/形状与表面/几何',
  tags: ['!dev']
};

const wireframeArgs = {
  wireframe: false,
  flatShading: false
};

const wireframeArgTypes = {
  wireframe: { name: 'material.wireframe', control: 'boolean' },
  flatShading: { name: 'material.flatShading', control: 'boolean' }
};

export const BoxGeometry = {
  name: 'BoxGeometry',
  args: {
    width: 1.6,
    height: 1.6,
    depth: 1.6,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
    ...wireframeArgs
  },
  argTypes: {
    width: { name: 'width', control: { type: 'range', min: 0.4, max: 2.4, step: 0.1 } },
    height: { name: 'height', control: { type: 'range', min: 0.4, max: 2.4, step: 0.1 } },
    depth: { name: 'depth', control: { type: 'range', min: 0.4, max: 2.4, step: 0.1 } },
    widthSegments: {
      name: 'widthSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    heightSegments: {
      name: 'heightSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    depthSegments: {
      name: 'depthSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(boxGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const SphereGeometry = {
  name: 'SphereGeometry',
  args: {
    radius: 1.1,
    widthSegments: 24,
    heightSegments: 16,
    phiLength: Math.PI * 2,
    thetaLength: Math.PI,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.3, max: 1.6, step: 0.05 } },
    widthSegments: {
      name: 'widthSegments',
      control: { type: 'range', min: 3, max: 48, step: 1 }
    },
    heightSegments: {
      name: 'heightSegments',
      control: { type: 'range', min: 2, max: 32, step: 1 }
    },
    phiLength: {
      name: 'phiLength',
      control: { type: 'range', min: 0.4, max: Math.PI * 2, step: 0.1 }
    },
    thetaLength: {
      name: 'thetaLength',
      control: { type: 'range', min: 0.3, max: Math.PI, step: 0.1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(sphereGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const PlaneGeometry = {
  name: 'PlaneGeometry',
  args: {
    width: 2.4,
    height: 2.4,
    widthSegments: 1,
    heightSegments: 1,
    ...wireframeArgs
  },
  argTypes: {
    width: { name: 'width', control: { type: 'range', min: 0.5, max: 3.5, step: 0.1 } },
    height: { name: 'height', control: { type: 'range', min: 0.5, max: 3.5, step: 0.1 } },
    widthSegments: {
      name: 'widthSegments',
      control: { type: 'range', min: 1, max: 24, step: 1 }
    },
    heightSegments: {
      name: 'heightSegments',
      control: { type: 'range', min: 1, max: 24, step: 1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(planeGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const CylinderGeometry = {
  name: 'CylinderGeometry',
  args: {
    radiusTop: 0.85,
    radiusBottom: 0.85,
    height: 1.8,
    radialSegments: 16,
    heightSegments: 1,
    openEnded: false,
    ...wireframeArgs
  },
  argTypes: {
    radiusTop: {
      name: 'radiusTop',
      control: { type: 'range', min: 0.1, max: 1.4, step: 0.05 }
    },
    radiusBottom: {
      name: 'radiusBottom',
      control: { type: 'range', min: 0.1, max: 1.4, step: 0.05 }
    },
    height: { name: 'height', control: { type: 'range', min: 0.4, max: 2.6, step: 0.1 } },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 48, step: 1 }
    },
    heightSegments: {
      name: 'heightSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    openEnded: { name: 'openEnded', control: 'boolean' },
    ...wireframeArgTypes
  },
  render: sceneStory(cylinderGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const ConeGeometry = {
  name: 'ConeGeometry',
  args: {
    radius: 1.0,
    height: 1.8,
    radialSegments: 16,
    heightSegments: 1,
    openEnded: false,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.2, max: 1.5, step: 0.05 } },
    height: { name: 'height', control: { type: 'range', min: 0.4, max: 2.6, step: 0.1 } },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 48, step: 1 }
    },
    heightSegments: {
      name: 'heightSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    openEnded: { name: 'openEnded', control: 'boolean' },
    ...wireframeArgTypes
  },
  render: sceneStory(coneGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const TorusGeometry = {
  name: 'TorusGeometry',
  args: {
    radius: 0.95,
    tube: 0.32,
    radialSegments: 12,
    tubularSegments: 48,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.3, max: 1.4, step: 0.05 } },
    tube: { name: 'tube', control: { type: 'range', min: 0.05, max: 0.55, step: 0.01 } },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 32, step: 1 }
    },
    tubularSegments: {
      name: 'tubularSegments',
      control: { type: 'range', min: 8, max: 96, step: 1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(torusGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const CapsuleGeometry = {
  name: 'CapsuleGeometry',
  args: {
    radius: 0.55,
    length: 0.9,
    capSegments: 4,
    radialSegments: 12,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.15, max: 1.0, step: 0.05 } },
    length: { name: 'length', control: { type: 'range', min: 0.1, max: 2.0, step: 0.05 } },
    capSegments: {
      name: 'capSegments',
      control: { type: 'range', min: 1, max: 12, step: 1 }
    },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 32, step: 1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(capsuleGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const CircleGeometry = {
  name: 'CircleGeometry',
  args: {
    radius: 1.2,
    segments: 32,
    thetaLength: Math.PI * 2,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.3, max: 1.8, step: 0.05 } },
    segments: { name: 'segments', control: { type: 'range', min: 3, max: 64, step: 1 } },
    thetaLength: {
      name: 'thetaLength',
      control: { type: 'range', min: 0.3, max: Math.PI * 2, step: 0.1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(circleGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const RingGeometry = {
  name: 'RingGeometry',
  args: {
    innerRadius: 0.45,
    outerRadius: 1.2,
    thetaSegments: 32,
    phiSegments: 1,
    thetaLength: Math.PI * 2,
    ...wireframeArgs
  },
  argTypes: {
    innerRadius: {
      name: 'innerRadius',
      control: { type: 'range', min: 0.05, max: 1.2, step: 0.05 }
    },
    outerRadius: {
      name: 'outerRadius',
      control: { type: 'range', min: 0.3, max: 1.8, step: 0.05 }
    },
    thetaSegments: {
      name: 'thetaSegments',
      control: { type: 'range', min: 3, max: 64, step: 1 }
    },
    phiSegments: {
      name: 'phiSegments',
      control: { type: 'range', min: 1, max: 8, step: 1 }
    },
    thetaLength: {
      name: 'thetaLength',
      control: { type: 'range', min: 0.3, max: Math.PI * 2, step: 0.1 }
    },
    ...wireframeArgTypes
  },
  render: sceneStory(ringGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const TorusKnotGeometry = {
  name: 'TorusKnotGeometry',
  args: {
    radius: 0.85,
    tube: 0.28,
    tubularSegments: 96,
    radialSegments: 16,
    p: 2,
    q: 3,
    ...wireframeArgs
  },
  argTypes: {
    radius: { name: 'radius', control: { type: 'range', min: 0.3, max: 1.3, step: 0.05 } },
    tube: { name: 'tube', control: { type: 'range', min: 0.05, max: 0.5, step: 0.01 } },
    tubularSegments: {
      name: 'tubularSegments',
      control: { type: 'range', min: 16, max: 160, step: 1 }
    },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 32, step: 1 }
    },
    p: { name: 'p', control: { type: 'range', min: 1, max: 6, step: 1 } },
    q: { name: 'q', control: { type: 'range', min: 1, max: 8, step: 1 } },
    ...wireframeArgTypes
  },
  render: sceneStory(torusKnotGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const PolyhedronGeometry = {
  name: '多面体族',
  args: {
    kind: 'icosahedron',
    radius: 1.15,
    detail: 0,
    ...wireframeArgs
  },
  argTypes: {
    kind: {
      name: '类型',
      control: 'select',
      options: ['tetrahedron', 'octahedron', 'dodecahedron', 'icosahedron']
    },
    radius: { name: 'radius', control: { type: 'range', min: 0.4, max: 1.6, step: 0.05 } },
    detail: { name: 'detail', control: { type: 'range', min: 0, max: 3, step: 1 } },
    ...wireframeArgTypes
  },
  render: sceneStory(polyhedronGeometryExample),
  parameters: sceneSource(builtInSource)
};

export const CustomGeometry = {
  name: '自定义几何',
  args: {
    useIndex: true,
    computeNormals: true
  },
  argTypes: {
    useIndex: {
      name: '使用 index',
      control: 'boolean',
      description: '关闭后改为 non-indexed，顶点会被复制。'
    },
    computeNormals: {
      name: 'computeVertexNormals()',
      control: 'boolean',
      description: '关闭后受光材质缺少 normal，明暗会异常。'
    }
  },
  render: sceneStory(customGeometryExample),
  parameters: sceneSource(customSource)
};

export const ShapeGeometry = {
  name: 'ShapeGeometry',
  args: {
    curveSegments: 12
  },
  argTypes: {
    curveSegments: {
      name: 'curveSegments',
      control: { type: 'range', min: 1, max: 32, step: 1 }
    }
  },
  render: sceneStory(shapeGeometryExample),
  parameters: sceneSource(shapeSource)
};

export const ExtrudeGeometry = {
  name: 'ExtrudeGeometry',
  args: {
    depth: 0.45,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSegments: 2
  },
  argTypes: {
    depth: {
      name: 'depth',
      control: { type: 'range', min: 0.05, max: 1.2, step: 0.05 }
    },
    steps: {
      name: 'steps',
      control: { type: 'range', min: 1, max: 8, step: 1 }
    },
    bevelEnabled: { name: 'bevelEnabled', control: 'boolean' },
    bevelThickness: {
      name: 'bevelThickness',
      control: { type: 'range', min: 0.01, max: 0.25, step: 0.01 }
    },
    bevelSegments: {
      name: 'bevelSegments',
      control: { type: 'range', min: 1, max: 8, step: 1 }
    }
  },
  render: sceneStory(extrudeGeometryExample),
  parameters: sceneSource(extrudeSource)
};

export const LatheGeometry = {
  name: 'LatheGeometry',
  args: {
    segments: 24,
    phiLengthDeg: 360
  },
  argTypes: {
    segments: {
      name: 'segments',
      control: { type: 'range', min: 3, max: 64, step: 1 }
    },
    phiLengthDeg: {
      name: 'phiLength（度）',
      control: { type: 'range', min: 40, max: 360, step: 5 }
    }
  },
  render: sceneStory(latheGeometryExample),
  parameters: sceneSource(latheSource)
};

export const TubeGeometry = {
  name: 'TubeGeometry',
  args: {
    tubularSegments: 64,
    radius: 0.22,
    radialSegments: 10,
    closed: false
  },
  argTypes: {
    tubularSegments: {
      name: 'tubularSegments',
      control: { type: 'range', min: 8, max: 128, step: 1 }
    },
    radius: {
      name: 'radius',
      control: { type: 'range', min: 0.05, max: 0.45, step: 0.01 }
    },
    radialSegments: {
      name: 'radialSegments',
      control: { type: 'range', min: 3, max: 24, step: 1 }
    },
    closed: { name: 'closed', control: 'boolean' }
  },
  render: sceneStory(tubeGeometryExample),
  parameters: sceneSource(tubeSource)
};

export const TextGeometryDemo = {
  name: 'TextGeometry',
  args: {
    size: 0.9,
    depth: 0.22,
    curveSegments: 6,
    bevelEnabled: true
  },
  argTypes: {
    size: {
      name: 'size',
      control: { type: 'range', min: 0.3, max: 1.4, step: 0.05 }
    },
    depth: {
      name: 'depth',
      control: { type: 'range', min: 0.02, max: 0.6, step: 0.02 }
    },
    curveSegments: {
      name: 'curveSegments',
      control: { type: 'range', min: 1, max: 16, step: 1 }
    },
    bevelEnabled: { name: 'bevelEnabled', control: 'boolean' }
  },
  render: sceneStory(textGeometryExample),
  parameters: sceneSource(textSource)
};

export const MorphAttributes = {
  name: 'morphAttributes',
  args: {
    influence: 0
  },
  argTypes: {
    influence: {
      name: 'morphTargetInfluences[0]',
      control: { type: 'range', min: 0, max: 1, step: 0.01 }
    }
  },
  render: sceneStory(morphAttributesExample),
  parameters: sceneSource(morphSource)
};

export const VertexUpdate = {
  name: '顶点更新',
  args: {
    amplitude: 0.35,
    syncNeedsUpdate: true,
    recomputeBounds: true
  },
  argTypes: {
    amplitude: {
      name: '位移幅度',
      control: { type: 'range', min: 0, max: 1.2, step: 0.05 }
    },
    syncNeedsUpdate: {
      name: 'position.needsUpdate',
      control: 'boolean',
      description: '关闭后 CPU 已改顶点，GPU 可能仍显示旧形状。'
    },
    recomputeBounds: {
      name: 'computeBoundingSphere()',
      control: 'boolean',
      description: '关闭后包围体可能过期，极端位移时可能被误剔除。'
    }
  },
  render: sceneStory(vertexUpdateExample),
  parameters: sceneSource(vertexUpdateSource)
};

export const GeometryTransform = {
  name: '几何变换',
  args: {
    mode: 'object3d',
    angleDeg: 35
  },
  argTypes: {
    mode: {
      name: '变换方式',
      control: 'inline-radio',
      options: ['object3d', 'baked']
    },
    angleDeg: {
      name: '角度',
      control: { type: 'range', min: 0, max: 90, step: 1 }
    }
  },
  render: sceneStory(geometryTransformExample),
  parameters: sceneSource(transformSource)
};
