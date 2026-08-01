/*
本示例验证不安装本地包时的 CDN import map。
输入是固定到 three 0.185.1 的核心与 Addons URL；主要操作是导入两个入口、核对 revision，并创建 WebGLRenderer 清屏。
预期结果是三项绿色检查和一块紫蓝色画布。读代码时先看 cdn.html 的同版本映射，再核对这里的导入与运行时读数。
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
addCheck(`CDN 核心模块已导入：three r${THREE.REVISION}`);
addCheck(`CDN Addon 已导入：${OrbitControls.name}`);

try {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(640, 320, false);
  renderer.setClearColor('#3c3a73', 1);
  renderer.clear();
  stage.append(renderer.domElement);
  addCheck('同版本 CDN 模块已完成清屏');
} catch (error) {
  addCheck(`WebGLRenderer 创建失败：${error.message}`, false);
}
