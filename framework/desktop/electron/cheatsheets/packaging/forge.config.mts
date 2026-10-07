/**
 * 范例：打包视角的 forge.config.mts（在 vite-typescript 模板产物上扩展 packagerConfig）。
 *
 * 演示内容：packagerConfig 常用字段与 makers 的平台约束如何决定 package / make 产物。
 * 前置状态：项目由 `npx create-electron-app@latest my-app --template=vite-typescript` 创建。
 * 主要观察：`npm run package` 产出 out/my-app-darwin-arm64/（app.asar + app.asar.unpacked）；
 * `npm run make` 产出 out/make/zip/darwin/arm64/ 下的 zip 分发包。
 * 阅读主线：packagerConfig 逐字直通 @electron/packager（字段语义见课程表格）；
 * maker 构造器第二个参数限定 platforms，不在列表内的平台不产该格式；
 * 被注释的字段都是可选覆盖项，按需打开。
 */
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    // 源码归档进 app.asar；packager 自身默认 false，模板设为 true
    asar: true,

    // 应用显示名：命名产物目录与 .app；缺省取 package.json 的 productName || name
    // name: 'My App',

    // macOS 的 CFBundleIdentifier，反域名格式；不设时为 com.example.<应用名> 占位值
    appBundleId: 'com.example.my-app',

    // 可执行文件名，缺省同应用名；显示名含空格或中文时建议显式设置
    // executableName: 'my-app',

    // 应用图标：macOS 用 .icns、Windows 用 .ico，扩展名可省略；Linux 不支持此字段
    // icon: './assets/icon',

    // 追加排除项：正则匹配文件绝对路径（不支持 glob）。
    // Vite 模板下 src/ 与构建配置已被 bundle 收编，进 asar 只增加体积
    ignore: [/\/src\//, /vite\.(main|preload|renderer)\.config\.mts/],

    // 重复打包时覆盖已有产物目录；默认 false，已存在的目录会被跳过
    // overwrite: true,

    // 追加到应用资源目录的外部文件（macOS 落在 Contents/Resources/），
    // 运行时用 process.resourcesPath 定位；常用于放 asar 内不能执行的外部二进制
    // extraResource: ['./extras/ffmpeg'],
  },
  rebuildConfig: {},
  makers: [
    // Squirrel.Windows 默认平台 win32，只能在 Windows（或 Linux 加 mono 与 wine）上产出
    new MakerSquirrel({}),
    // 构造器第二个参数限定 platforms：zip 只在 macOS 上生成
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    // 自动把 node_modules 里的原生模块追加进 asar.unpack，落到 app.asar.unpacked/
    new AutoUnpackNativesPlugin({}),
    // 打包时写入 Electron fuse；EnableEmbeddedAsarIntegrityValidation 让运行时
    // 校验 app.asar 哈希，配合签名才形成完整防线（见 8.3）
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
    new VitePlugin({
      // build 数组：每个可执行进程一个入口；产物 .vite/build/main.cjs、preload.cjs
      // renderer 数组：每个页面一项；产物 .vite/renderer/main_window/
      // 三条构建线的完整讲解见「接入 TypeScript」课程
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.mts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
    }),
  ],
};

export default config;
