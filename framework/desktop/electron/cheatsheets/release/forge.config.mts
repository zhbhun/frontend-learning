/**
 * 范例：发布流程视角的 forge.config.mts——publishers 的发布动作侧选项（8.4 课程讲的是更新侧）。
 *
 * 演示内容：publisher-github 的 tagPrefix / draft / prerelease / generateReleaseNotes / force，
 *           以及 makers 与发布产物的关系（产物结构与选型见 8.1 / 8.2 课程的配置）。
 * 前置状态：项目由 `npx create-electron-app@latest my-app --template=vite-typescript` 创建；
 *           已安装 @electron-forge/publisher-github；认证读环境变量 GITHUB_TOKEN
 *           （GitHub Actions 中自动可用，workflow 需授予 permissions: contents: write）。
 * 主要观察：`npx electron-forge publish` 级联 package → make 后，Releases 页出现 v{version}
 *           命名的 Release——draft: true 时先以草稿存在，人工点 Publish 后才对更新链路生效。
 * 阅读主线：version 是发布主键 → tagPrefix + version 得到 Release 名 → 闸门选项控制生效方式。
 */
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDEB } from '@electron-forge/maker-deb';
import { MakerRPM } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // 版本元数据无需显式配置：appVersion 默认取 package.json 的 version，
    // 打包时写进 macOS 的 CFBundleShortVersionString 与 Windows 的 ProductVersion
  },
  rebuildConfig: {},
  makers: [
    // 产物结构与各 maker 的宿主约束见「打包」与「多平台构建」课程；
    // 三平台 makers 配齐后，每台 CI runner 只产出宿主支持的格式
    new MakerZIP({}, ['darwin']),   // macOS 分发兜底，也是 Squirrel.Mac 的更新包格式
    new MakerDMG({}, ['darwin']),   // macOS 标准分发格式
    new MakerSquirrel({}, ['win32']), // Setup.exe + full.nupkg + RELEASES 三件套
    new MakerDEB(
      { maintainer: 'your-org', homepage: 'https://my-app.example.com' },
      ['linux'],
    ),
    new MakerRPM({}, ['linux']),
  ],
  publishers: [
    {
      // 把 make 产物上传到 GitHub Releases；三台 CI runner 按同一 Release 名各传宿主产物
      name: '@electron-forge/publisher-github',
      // platforms 默认发布所有平台产物，需要收窄时再指定
      config: {
        repository: { owner: 'your-org', name: 'my-app' },
        // Release tag = tagPrefix + package.json 的 version（默认前缀 "v"）。
        // 它不读你推的 git tag——用 npm version 升版打标让两者天然一致
        tagPrefix: 'v',
        // 闸门一：草稿 Release——产物已上传但公众不可见，更新服务不认（8.4 规则）；
        // 在 Releases 页人工把关后手动点 Publish 才生效
        draft: true,
        // 闸门二：预发布标记——beta 发布时打开，配合 semver prerelease 后缀
        // （npm version prerelease --preid=beta 得到 1.3.0-beta.0）构成渠道原料
        prerelease: false,
        // 让 GitHub 自动汇总两次发布之间的 PR 作为 release notes，正式发布前人工补写重点
        generateReleaseNotes: true,
        // 同版本补传（覆盖已有 Release 的同名产物）时才打开；日常发布保持关闭
        // force: true,
      },
    },
    // 产物放对象存储或自建更新源的场景改用 publisher-s3 等，见「自动更新」课程
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
