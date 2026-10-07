/**
 * 参考实现：收集用户环境信息，作为 bug 报告模板与崩溃 extra 的单一来源。
 *
 * 输入：无需参数；app.getLocale() 依赖 ready 之后的调用时机，本函数请在 app.whenReady() 内使用。
 * 主线：应用与运行时版本（app / process.versions）→ 平台、架构与系统版本 → 用户侧环境
 *       （locale、国家码）→ 汇成一份全部为字符串的记录。
 * 预期：返回值可直接填入 crashReporter 的 globalExtra（键 ≤39 字节、值 ≤20320 字节，
 *       超长截断），也可用 toBugReportMd() 渲染成 Markdown 列表贴进 issue。
 * 边界：这些都是公开的设备与版本信息，不含个人标识；上传开关仍应交给用户偏好。
 */
import os from 'node:os';

import { app } from 'electron';

export function collectEnvInfo(): Record<string, string> {
  return {
    // 应用版本：package.json 没写 version 时回退到可执行文件的版本
    appVersion: app.getVersion(),
    // 运行时版本：排查"是不是某版本引入的"第一依据（主进程下 node 字段可用）
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? '',
    // 平台与架构
    platform: process.platform,
    arch: process.arch,
    // 系统版本：getSystemVersion 给真实系统版本（macOS '15.x'）；
    // os.release() 给的是内核版本（macOS '24.x'），两者别混用
    osVersion: process.getSystemVersion() || os.release(),
    // 用户侧环境：getLocale 须在 ready 后调用；国家码可能为空字符串
    locale: app.getLocale(),
    country: app.getLocaleCountryCode(),
    // 信息来自哪一侧：browser / renderer / utility 等
    processType: process.type ?? 'browser',
  };
}

/** 渲染成可直接粘贴进 issue 的 Markdown 列表（bug 报告模板） */
export function toBugReportMd(info: Record<string, string>): string {
  return Object.entries(info)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
}
