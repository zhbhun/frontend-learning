/**
 * 范例：多平台视角的 forge.config.mts（在 vite-typescript 模板产物上扩展 makers）。
 *
 * 演示内容：三大平台各配哪些 maker，platforms 数组与宿主约束如何共同决定 make 产物。
 * 前置状态：项目由 `npx create-electron-app@latest my-app --template=vite-typescript` 创建；
 * packagerConfig 的完整讲解见「打包」课程（cheatsheets/packaging/forge.config.mts）。
 * 主要观察：在 macOS 上 `npm run make` 只产出 zip 与 dmg；Setup.exe、msi、rpm
 * 分别需要 Windows / WiX 工具链 / Linux 宿主，由 CI 矩阵补齐（见本目录 build.yml）。
 * 阅读主线：makers 数组 → 每个条目的配置对象 + platforms 数组 → 注释里的宿主平台约束。
 */
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
  packagerConfig: {
    // 多平台通用配置（asar、图标、ignore 等）见「打包」课程的 forge.config.mts
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    // ── macOS ────────────────────────────────────────────────────
    // zip：全平台兜底格式；Squirrel.Mac 自动更新链路要求 macOS 同时产出 zip
    new MakerZIP({}, ['darwin']),
    // dmg：macOS 标准分发格式，只能在 macOS 上构建
    new MakerDMG({}, ['darwin']),

    // ── Windows ──────────────────────────────────────────────────
    // Squirrel：一次产出 <name> Setup.exe / <name>-full.nupkg / RELEASES 三个文件；
    // 只能在 Windows（或装了 mono 与 wine 的 Linux）上执行，macOS 不在支持列表
    new MakerSquirrel(
      {
        // Forge 字段是复数 authors；缺省时取 package.json 的 author 与 description
        // authors: ['Your Name'],
      },
      ['win32'],
    ),
    // WiX（msi）：宿主必须装有 WiX Toolset v3（choco install wixtoolset --version=3.14.0），
    // 仅当企业内部分发政策要求 msi 时才加：
    // import { MakerWix } from '@electron-forge/maker-wix';
    // new MakerWix({ language: 1033, manufacturer: 'Your Company' }, ['win32']),

    // ── Linux ────────────────────────────────────────────────────
    // deb：Debian 系标准格式；可在 Linux 或 macOS 上构建（宿主需 fakeroot 与 dpkg）
    new MakerDeb(
      {
        options: {
          maintainer: 'Your Name',
          homepage: 'https://example.com',
        },
      },
      ['linux'],
    ),
    // rpm：Red Hat 系标准格式；只能在 Linux 上构建（宿主需 rpm 或 rpm-build，
    // Debian/Ubuntu 宿主用 `sudo apt-get install rpm` 补齐）
    new MakerRpm(
      {
        options: {
          homepage: 'https://example.com',
        },
      },
      ['linux'],
    ),
    // 注意：Forge 没有官方 AppImage maker；需要 AppImage 时用 electron-builder 等替代方案
  ],
};

export default config;
