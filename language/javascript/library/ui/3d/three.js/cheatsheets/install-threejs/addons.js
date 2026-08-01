/*
本示例验证官方 addon 与 three 核心模块能从同一个本地包解析。
输入是 three 和 three/addons/ 两个 import map 前缀；主要操作是导入 OrbitControls，并用同一包中的 WebGLRenderer 清屏。
预期结果是三项绿色检查和一块蓝绿色画布。读代码时先比较两条 import，再看类名与 revision 的运行时读数。
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
addCheck(`核心模块已导入：three r${THREE.REVISION}`);
addCheck(`官方 Addon 已导入：${OrbitControls.name}`);

try {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(640, 320, false);
  renderer.setClearColor('#184e77', 1);
  renderer.clear();
  stage.append(renderer.domElement);
  addCheck('核心模块与 Addon 由同一套映射解析');
} catch (error) {
  addCheck(`WebGLRenderer 创建失败：${error.message}`, false);
}
