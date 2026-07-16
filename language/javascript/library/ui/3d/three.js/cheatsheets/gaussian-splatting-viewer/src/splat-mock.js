import * as THREE from 'three';
import { seededRandom } from './shared-stage.js';

const matrix = new THREE.Matrix4();
const scaleVector = new THREE.Vector3();
const animatedPosition = new THREE.Vector3();

export function createSplatBillboardMaterial({ opacity = 0.68, alphaTest = 0.01, depthWrite = false } = {}) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite,
    vertexColors: true,
    uniforms: {
      uOpacity: { value: opacity },
      uAlphaTest: { value: alphaTest }
    },
    vertexShader: `
      attribute mat4 instanceMatrix;
      attribute vec3 instanceColor;
      varying vec2 vUv;
      varying vec3 vColor;

      void main() {
        vUv = uv;
        vColor = instanceColor;
        vec4 localPosition = instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * localPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uAlphaTest;
      varying vec2 vUv;
      varying vec3 vColor;

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float radius = dot(centered, centered);
        float softEdge = 1.0 - smoothstep(0.45, 1.0, radius);
        float alpha = softEdge * uOpacity;

        if (alpha <= uAlphaTest) {
          discard;
        }

        gl_FragColor = vec4(vColor, alpha);
      }
    `
  });

  material.name = '教学用 billboard splat mock';
  return material;
}

export function createSplatInstancedMesh(records, material = createSplatBillboardMaterial()) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geometry, material, records.length);

  records.forEach((record, index) => {
    mesh.setColorAt(index, record.color);
  });

  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return mesh;
}

export function updateSplatBillboards(mesh, records, camera, { scaleMultiplier = 1, elapsed = 0, wobble = 0 } = {}) {
  records.forEach((record, index) => {
    animatedPosition.copy(record.position);

    if (wobble > 0) {
      animatedPosition.y += Math.sin(elapsed * 1.4 + record.seed * 20) * wobble;
    }

    scaleVector.set(
      record.scale.x * scaleMultiplier,
      record.scale.y * scaleMultiplier,
      1
    );
    matrix.compose(animatedPosition, camera.quaternion, scaleVector);
    mesh.setMatrixAt(index, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
}

export function generateSplatRecords(count, {
  seed = 12,
  radius = 1.5,
  flatten = 0.66,
  palette = ['#f0b35e', '#d85f47', '#5ab38e', '#6a86c8']
} = {}) {
  const random = seededRandom(seed + count * 11);
  const colors = palette.map((value) => new THREE.Color(value));
  const records = [];

  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const distance = Math.cbrt(random()) * radius;
    const band = Math.floor(random() * colors.length);
    const position = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * distance,
      Math.cos(phi) * distance * flatten,
      Math.sin(phi) * Math.sin(theta) * distance
    );

    const longAxis = 0.13 + random() * 0.24;
    const shortAxis = 0.055 + random() * 0.11;

    records.push({
      position,
      scale: new THREE.Vector3(longAxis, shortAxis, 1),
      color: colors[band].clone().lerp(colors[(band + 1) % colors.length], random() * 0.42),
      seed: random()
    });
  }

  return records;
}
