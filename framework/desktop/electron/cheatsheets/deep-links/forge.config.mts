/**
 * 范例：让打包产物登记深链协议（forge.config.mts，节选到本课相关的配置块）。
 *
 * 演示内容：macOS 用 packagerConfig.protocols 在构建期写入 Info.plist 的
 * CFBundleURLTypes；Linux 用 deb maker 的 mimeType 把 x-scheme-handler 写进
 * .desktop；Windows 不需要打包配置——运行时 setAsDefaultProtocolClient 写注册表。
 * 前置状态：schemes / mimeType 里的协议名必须与 src/main.ts 的 SCHEME 常量一致（本例 'myapp'）。
 * 主要观察：打包安装后，系统「默认应用」设置里能看到 myapp 协议登记；
 * 浏览器打开 myapp://task/42 会唤起应用。
 * 阅读主线：三平台的登记载体各不相同——plist（打包期）、.desktop（安装期）、注册表（运行期）。
 */
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // macOS：构建期写进 Info.plist 的 CFBundleURLTypes。
    // name 是系统设置里显示的处理程序名，schemes 是协议名数组
    protocols: [
      {
        name: 'MyApp',
        schemes: ['myapp'],
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    // Windows：Squirrel 产物不需要配置协议，运行时注册见 src/main.ts
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerDeb(
      {
        options: {
          // Linux：安装期写进 .desktop 的 MimeType，登记发生在安装时（rpm 产物同理需要 .desktop 登记）
          mimeType: ['x-scheme-handler/myapp'],
        },
      },
      ['linux'],
    ),
  ],
  plugins: [
    new VitePlugin({
      // 三条构建线的完整说明见「接入 TypeScript」一课，此处省略
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.mts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
    }),
  ],
};

export default config;
