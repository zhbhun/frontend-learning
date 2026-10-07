/**
 * 范例：vite-typescript 模板生成的 forge.config.mts（节选到本课相关的配置块）。
 *
 * 演示内容：VitePlugin 的 build / renderer 两组配置如何注册三条构建线。
 * 前置状态：项目由 `npx create-electron-app@latest my-app --template=vite-typescript` 创建。
 * 主要观察：`npm start` 时 Forge 按此配置产出 `.vite/build/main.cjs`、
 * `.vite/build/preload.cjs` 与 `.vite/renderer/main_window/`。
 * 阅读主线：build 数组对应可执行进程入口，renderer 数组对应页面；
 * name 的写法决定魔法常量前缀（main_window -> MAIN_WINDOW_VITE_*）。
 */
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    // 构造器写法让各 maker 的选项获得完整类型提示
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new VitePlugin({
      // build 数组：每个可执行进程一个入口（main、preload、worker 等）
      // entry 是对应配置文件里 build.lib.entry 的别名
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.mts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mts',
          target: 'preload',
        },
      ],
      // renderer 数组：每个页面一项，模板默认为空的 defineConfig({}) 即够用
      // name 大写、连字符转下划线后生成 <NAME>_VITE_DEV_SERVER_URL / <NAME>_VITE_NAME
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mts',
        },
      ],
    }),
  ],
};

export default config;
