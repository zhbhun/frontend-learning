/*
本示例验证只安装 three 后的最小运行链路。
输入是 index.html 中映射到 node_modules 的 import map；主要操作是读取 THREE.REVISION、创建 WebGLRenderer、挂载 canvas 并清屏。
预期结果是两项绿色检查和一块深蓝色画布。读代码时先看模块导入，再看 try 块中的渲染器创建过程。
*/

import * as THREE from 'three';

const revision = document.querySelector('[data-revision]');
const checks = document.querySelector('[data-checks]');
const stage = document.querySelector('[data-renderer-stage]');

function addCheck(message, ok = true) {
  const item = document.createElement('li');
  item.className = ok ? 'check' : 'check check-fail';
  item.textContent = message;
  checks.append(item);
}

revision.textContent = THREE.REVISION;
addCheck(`核心模块已导入：three r${THREE.REVISION}`);

try {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(640, 320, false);
  renderer.setClearColor('#14213d', 1);
  renderer.clear();
  stage.append(renderer.domElement);
  addCheck('WebGLRenderer 已创建并完成清屏');
} catch (error) {
  addCheck(`WebGLRenderer 创建失败：${error.message}`, false);
}
