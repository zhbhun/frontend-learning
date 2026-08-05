import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('ROADMAP 决定课程顺序，并静默过滤缺失和未列课程', async () => {
  let roadmapStories;

  try {
    ({ roadmapStories } = await import('./roadmap-stories.js'));
  } catch (error) {
    assert.fail(`无法加载路线排序实现：${error.message}`);
  }

  const workspaceDir = await mkdtemp(
    path.join(tmpdir(), 'threejs-roadmap-stories-')
  );

  try {
    await Promise.all(
      ['second', 'first', 'unlisted'].map((name) =>
        mkdir(path.join(workspaceDir, 'cheatsheets', name), {
          recursive: true
        })
      )
    );
    await writeFile(
      path.join(workspaceDir, 'ROADMAP.md'),
      `# 测试路线

- 1. 第一阶段
  - [1.1 第二课](cheatsheets/second/README.mdx)
    路线中先出现。
  - [1.2 占位课](cheatsheets/missing/README.mdx)
    文件尚未创建。
- 2. 第二阶段
  - [2.1 第一课](cheatsheets/first/README.mdx)
    路线中后出现。
`
    );
    await writeFile(
      path.join(workspaceDir, 'cheatsheets/second/README.mdx'),
      '# Second\n'
    );
    await writeFile(
      path.join(workspaceDir, 'cheatsheets/second/second.stories.js'),
      'export default {};\n'
    );
    await writeFile(
      path.join(workspaceDir, 'cheatsheets/first/README.mdx'),
      '# First\n'
    );
    await writeFile(
      path.join(workspaceDir, 'cheatsheets/unlisted/README.mdx'),
      '# Hidden\n'
    );

    assert.deepEqual(roadmapStories({ workspaceDir }), [
      '../cheatsheets/second/second.stories.js',
      '../cheatsheets/second/README.mdx',
      '../cheatsheets/first/README.mdx'
    ]);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
