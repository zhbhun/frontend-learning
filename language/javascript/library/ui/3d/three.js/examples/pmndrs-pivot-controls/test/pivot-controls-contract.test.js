import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const exampleRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readExampleFile(relativePath) {
  return readFileSync(resolve(exampleRoot, relativePath), 'utf8');
}

test('declares the React Three Fiber runtime dependencies', () => {
  const packageJson = JSON.parse(readExampleFile('package.json'));
  const dependencies = packageJson.dependencies;

  for (const dependency of ['react', 'react-dom', '@react-three/fiber', '@react-three/drei']) {
    assert.ok(dependencies[dependency], `${dependency} should be installed`);
  }
});

test('mounts a React app with a canvas, PivotControls and OrbitControls', () => {
  const html = readExampleFile('index.html');
  const entryPath = resolve(exampleRoot, 'src/main.jsx');

  assert.match(html, /src\/main\.jsx/);
  assert.ok(existsSync(entryPath), 'src/main.jsx should exist');

  const source = readFileSync(entryPath, 'utf8');
  assert.match(source, /<Canvas[\s\S]*fallback=/);
  assert.match(source, /<PivotScene[\s\S]*settings=\{settings\}/);
  assert.match(source, /PivotControls/);
  assert.match(source, /OrbitControls/);
});

test('wires the PivotControls props, drag lifecycle and responsive layout', () => {
  const entryPath = resolve(exampleRoot, 'src/main.jsx');
  const styles = readExampleFile('src/styles.css');

  assert.ok(existsSync(entryPath), 'src/main.jsx should exist');

  const source = readFileSync(entryPath, 'utf8');

  for (const prop of [
    'annotations',
    'fixed',
    'anchor',
    'activeAxes',
    'viewportAware',
    'scale',
    'lineWidth',
    'onDragStart',
    'onDrag',
    'onDragEnd'
  ]) {
    assert.match(source, new RegExp(`\\b${prop}\\b`), `${prop} should be wired to the example`);
  }

  assert.match(source, /<PivotObject \/>/);
  assert.doesNotMatch(source, /CameraFacingGizmo/);
  assert.match(source, /function ViewportAwareGizmo\(/);
  assert.match(source, /<ViewportAwareGizmo[\s\S]*enabled=\{settings\.viewportAware\}/);
  assert.match(source, /const layoutTurn = localCameraPosition\.current\.z < 0 \? Math\.PI : 0/);
  assert.match(source, /const renderedYaw = yaw \+ layoutTurn/);
  assert.match(source, /rotation\.set\(0, renderedYaw, 0\)/);
  assert.match(source, /<PivotControls[\s\S]*depthTest=\{false\}/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /grid-template-columns: 1fr/);
});

test('uses one cube as the controlled object', () => {
  const source = readExampleFile('src/main.jsx');
  const objectSource = source.match(/function PivotObject\(\) \{([\s\S]*?)\n\}\n\ncreateRoot/)?.[1];

  assert.ok(objectSource, 'PivotObject should be defined');
  assert.equal((objectSource.match(/<mesh\b/g) ?? []).length, 1);
  assert.match(objectSource, /<boxGeometry args=\{\[1\.8, 1\.8, 1\.8\]\} \/>/);
});
