import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { createServer } from 'vite';

const indexUrl = new URL('../storybook-static/index.json', import.meta.url);
const readmeUrl = new URL('../cheatsheets/camera/README.mdx', import.meta.url);
const workspacePath = fileURLToPath(new URL('..', import.meta.url));

async function readStorybookIndex() {
  const source = await readFile(indexUrl, 'utf8').catch(() => null);

  assert.ok(source, '缺少 Storybook 静态索引，请先运行 npm run build');
  return JSON.parse(source);
}

test('相机课程注册稳定的 Docs 永久链接', async () => {
  const index = await readStorybookIndex();
  const docs = index.entries['camera--docs'];

  assert.ok(docs, '缺少 camera--docs');
  assert.equal(docs.title, '核心系统/空间与对象/相机');
  assert.equal(docs.name, 'Docs');
});

test('三个相机成员都有独立的内嵌实例入口', async () => {
  const index = await readStorybookIndex();
  const expectedStoryIds = [
    'camera--camera-direction',
    'camera--perspective-projection',
    'camera--orthographic-projection'
  ];

  for (const storyId of expectedStoryIds) {
    assert.ok(index.entries[storyId], `缺少 ${storyId}`);
  }
});

test('每个相机 Canvas 后紧跟同一 Story 的参数调节面板', async () => {
  const source = await readFile(readmeUrl, 'utf8');
  const blocks = [...source.matchAll(/<(Canvas|Controls)\b([^>]*)\/>/g)].map(
    ([, blockName, attributes]) => {
      const storyName = attributes.match(
        /\bof=\{CameraStories\.([A-Za-z0-9_$]+)\}/
      )?.[1];

      return [blockName, storyName];
    }
  );
  const expectedStoryNames = [
    'CameraDirection',
    'PerspectiveProjection',
    'OrthographicProjection'
  ];
  const expectedBlocks = expectedStoryNames.flatMap((storyName) => [
    ['Canvas', storyName],
    ['Controls', storyName]
  ]);

  assert.deepEqual(blocks, expectedBlocks);
});

test('三个相机实例向 Canvas 暴露真实执行源码', async () => {
  const vite = await createServer({
    root: workspacePath,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true }
  });

  try {
    const module = await vite.ssrLoadModule(
      '/cheatsheets/camera/camera.stories.js'
    );
    const expectedStories = [
      ['CameraDirection', 'cameraDirectionExample'],
      ['PerspectiveProjection', 'perspectiveProjectionExample'],
      ['OrthographicProjection', 'orthographicProjectionExample']
    ];

    assert.deepEqual(module.default.tags, ['!dev']);

    for (const [exportName, memberMarker] of expectedStories) {
      const story = module[exportName];
      const source = story?.parameters?.docs?.source;

      assert.equal(typeof story?.render, 'function', `${exportName} 缺少真实 render`);
      assert.equal(source?.type, 'code', `${exportName} 缺少源码入口`);
      assert.equal(source?.language, 'jsextra');
      assert.match(source.code, new RegExp(memberMarker));
      assert.match(source.code, /renderer\.render\(scene, camera\)/);
      assert.match(source.code, /emitSnapshot/);
      assert.match(source.code, /readout\(snapshot\)/);
    }
  } finally {
    await vite.close();
  }
});
