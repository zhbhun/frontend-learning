<!--
  范例：消费 window.api 的最小组件（两个 composable 各接一个 IPC 方向）。

  演示内容：useApi 拉初始应用信息（invoke，3.2）；useIpcEvent 订阅
  主进程推送并显示计数（webContents.send，3.3）。
  主要观察：渲染端代码只出现 window.api 的具名能力，不出现通道名与
  ipcRenderer——桥的纪律跨框架不变。
  附加：标题行文案改后保存，文字热替换而推送计数不重置（SFC HMR）。
-->
<script setup lang="ts">
import { ref } from 'vue';

import { useApi } from './use-api';
import { useIpcEvent } from './use-ipc-event';

// 解构出来的是 Ref：script 里用 .value，模板里自动解包
const { data: info, loading, error } = useApi(() => window.api.readAppInfo());
const count = ref(0);

// window.api.onTick 是模块加载时就存在的稳定方法引用
useIpcEvent(window.api.onTick, (payload) => {
  count.value = payload.count;
});
</script>

<template>
  <main>
    <!-- 改这行文案保存：文字热替换，推送计数不重置（SFC HMR 保留状态） -->
    <h1>Vue 已接入渲染线</h1>
    <p>主进程推送计数：{{ count }}</p>
    <p v-if="loading">读取应用信息中……</p>
    <p v-if="error">读取失败：{{ error.message }}</p>
    <ul v-if="info">
      <li>Electron：{{ info.electron }}</li>
      <li>Node.js：{{ info.node }}</li>
      <li>平台：{{ info.platform }}</li>
    </ul>
  </main>
</template>
