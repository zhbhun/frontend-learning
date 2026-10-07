/**
 * 范例：自动更新视角的 forge.config.mts（在 vite-typescript 模板产物上扩展 makers 与 publishers）。
 *
 * 演示内容：更新链路的打包端与发布端配置——产物类型、macOS 更新清单、Windows 增量更新源、上传目的地。
 * 前置状态：项目由 `npx create-electron-app@latest my-app --template=vite-typescript` 创建；
 *           已安装 @electron-forge/publisher-github；macOS 更新要求 8.3 的签名公证配置已生效。
 * 主要观察：`npx electron-forge publish` 级联 make 后把 out/make/ 下产物上传到 GitHub Releases——
 *           macOS 得 zip + RELEASES.json 更新清单，Windows 得 Setup.exe + full.nupkg + RELEASES 三件套。
 * 阅读主线：macOS 客户端消费 zip + RELEASES.json，Windows 客户端消费三件套；
 *           应用端由 update-electron-app 或裸 autoUpdater 读取（见课程正文与 main.ts）。
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
    // macOS 的 Squirrel.Mac 校验应用签名：自动更新的前置是 8.3 课程的 osxSign / osxNotarize 配置
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    // macOS：zip 是 Squirrel.Mac 唯一认可的更新包格式。macUpdateManifestBaseUrl
    // 指向产物最终所在的对象存储前缀（官方按 平台/架构 分层存放）；
    // 配置后 make 会生成 RELEASES.json 更新清单，并在后续构建中把 currentRelease 递增到新版本。
    // 不配这个字段，zip 只是普通分发格式，不构成更新源。
    new MakerZIP(
      {
        macUpdateManifestBaseUrl: 'https://my-bucket.s3.amazonaws.com/my-app-updates/darwin',
      },
      ['darwin'],
    ),
    // Windows：产出 Setup.exe + full.nupkg + RELEASES 三件套。
    // remoteReleases 指向上一个版本产物所在的更新源时，make 会同时产出 delta.nupkg 增量包
    // （用户端只下载变化部分）；noDelta: true 可关闭增量包生成。
    new MakerSquirrel({
      remoteReleases: 'https://my-bucket.s3.amazonaws.com/my-app-updates/win32/x64',
      // noDelta: true,
    }),
  ],
  publishers: [
    {
      // 把 make 产物上传到 GitHub Releases；公开仓库由此免费获得 update.electronjs.org 更新服务
      name: '@electron-forge/publisher-github',
      // platforms: ['darwin', 'win32'], // 默认发布所有平台的产物，需要收窄时再指定
      config: {
        repository: { owner: 'your-org', name: 'my-app' },
        // 认证默认读环境变量 GITHUB_TOKEN（需仓库写权限）；
        // GitHub Actions 中还要给 workflow 授予 permissions: contents: write
        // draft / prerelease 为 true 的 Release 不会被 update.electronjs.org 认作可更新版本
        prerelease: false,
      },
    },
    // 私有应用的替代：改用 publisher-s3 把产物放进对象存储，
    // 应用端用 update-electron-app 的 StaticStorage 源读取（见课程正文）
  ],
  plugins: [
    // 打包期自动把原生模块追加进 asar.unpack（8.1 课程已讲）
    new AutoUnpackNativesPlugin({}),
    // 打包时写入 Electron fuse；asar 完整性校验配合签名形成完整防线（8.3 课程已讲）
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
    // 三端构建线的完整讲解见「接入 TypeScript」课程
    new VitePlugin({
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.mts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
    }),
  ],
};

export default config;
