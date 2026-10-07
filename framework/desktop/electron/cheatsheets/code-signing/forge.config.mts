/**
 * 范例：签名与公证视角的 forge.config.mts（在 vite-typescript 模板产物上扩展 packagerConfig）。
 *
 * 演示内容：macOS 签名（osxSign）与公证（osxNotarize）的最小配置、entitlements 的接入点，
 * 以及 Windows 侧 MakerSquirrel 的证书签名字段。
 * 前置状态：Apple Developer Program 会员；钥匙串装有 Developer ID Application 证书
 * （security find-identity -p codesigning -v 验证）；公证需 Xcode 13+；
 * 钥匙串里已用 xcrun notarytool store-credentials my-app-notary 存好公证凭据。
 * 主要观察：npm run package 日志先签名后公证（耗时数分钟）；产物经
 * codesign --verify --deep --strict 与 spctl -a -t exec -vv 验证为 Notarized Developer ID。
 * 阅读主线：osxSign 字段存在（哪怕空对象）签名才会执行；公证凭据三选一，
 * 一切秘密走环境变量或钥匙串，不写进本文件；Windows 的签名发生在 make 步（安装器层）。
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
    asar: true,

    // 发布前换成真实的反域名 bundle ID；一经发布就当作不可变资产，
    // 自动更新链路按"同一签名身份 + 同一 bundle ID + 递增版本号"比对
    appBundleId: 'com.yourco.my-app',

    // macOS 签名：字段存在（哪怕空对象）才启用。默认自动发现钥匙串里的
    // Developer ID Application 证书，并按公证场景处理 hardened runtime 与默认 entitlements
    osxSign: {},
    // 需要显式干预时展开：
    // osxSign: {
    //   // 机器上有多个候选证书时，显式指定身份（名字或 SHA-1 哈希）
    //   identity: 'Developer ID Application: Your Company (TEAMID)',
    //   // 自定义授权：指向自己的 plist（默认授权已覆盖多数项目，见同目录 entitlements.mac.plist）
    //   entitlements: './entitlements.mac.plist',
    //   // 公证报 hardened runtime 相关错误时显式确保开启
    //   hardenedRuntime: true,
    // },

    // macOS 公证：与签名同在 package 步执行，等 Apple 扫描结果（通常数分钟）。
    // 三种凭据三选一，下面按推荐顺序展示
    osxNotarize: {
      // 方式一（本地开发推荐）：凭据已存进钥匙串档案，本文件零秘密
      keychainProfile: 'my-app-notary',
      // 方式二：Apple ID + 应用专用密码（appleid.apple.com 单独生成，不是账号密码）
      // appleId: process.env.APPLE_ID,
      // appleIdPassword: process.env.APPLE_PASSWORD,
      // teamId: process.env.APPLE_TEAM_ID,
      // 方式三（CI 推荐）：App Store Connect API key，.p8 只能下载一次，给绝对路径
      // appleApiKey: '/absolute/path/AuthKey_X0X0X0X0X0.p8',
      // appleApiIssuer: '<Issuer ID>', // Xcode 26+ 的个人 API key 省略此字段，传了反而 401
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      // Windows 代码签名：make 步签在安装器上；密码从环境变量注入，绝不入库。
      // 2023-06 起纯软件 .pfx 的 OV 证书已买不到，需硬件 token 证书或云签名服务
      // certificateFile: './cert/windows-cert.pfx',
      // certificatePassword: process.env.CERTIFICATE_PASSWORD,
    }),
    // zip 是 macOS 直分发与 Squirrel.Mac 更新的载体，仍限定只在 macOS 产出
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    // asar 完整性校验 fuse：运行时校验 app.asar 哈希，与签名组成完整防线（见 8.1 / 8.3）
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
      // 三条构建线的完整讲解见「接入 TypeScript」课程；打包课示例有逐行注释
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.mts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.mts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.mts' }],
    }),
  ],
};

export default config;
