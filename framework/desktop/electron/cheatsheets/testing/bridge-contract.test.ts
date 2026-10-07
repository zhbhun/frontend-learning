/**
 * 契约测试示例：渲染端逻辑依赖 window.api，单测里用 stub 顶替 preload 的暴露面。
 * 输入 / 前置：Vitest 配置 jsdom 环境（environment: 'jsdom'），此时 window 即全局对象，
 *   vi.stubGlobal 挂上的 api 就是 window.api；stub 形状对齐 7.1 的 Api 接口。
 * 主要操作：stub readAppInfo 的返回值 → 调用被测渲染端函数 loadAppInfo →
 *   断言它按契约调用了桥、并原样消费返回值。
 * 预期结果：不需要 Electron 就能验证「渲染端怎么用桥」；桥的真实行为由端到端测试兜底。
 * 阅读主线：mock 输入 → 调用被测逻辑 → 断言调用次数与消费结果。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// 被测函数内部访问 window.api（如 const info = await window.api.readAppInfo()）
import { loadAppInfo } from './src/renderer/app-info';

const readAppInfo = vi.fn();

describe('loadAppInfo：渲染端对桥的调用契约', () => {
  beforeEach(() => {
    readAppInfo.mockReset();
    readAppInfo.mockResolvedValue({
      electron: '44.0.0',
      node: '24.0.0',
      platform: 'darwin',
    });
    // jsdom 环境下 window 即全局对象：stubGlobal 之后 window.api 存在
    vi.stubGlobal('api', { readAppInfo });
  });

  it('调用 readAppInfo 并原样消费返回值', async () => {
    const info = await loadAppInfo();

    expect(readAppInfo).toHaveBeenCalledOnce();
    expect(info.platform).toBe('darwin');
  });

  it('桥抛错时按约定向上传播', async () => {
    readAppInfo.mockRejectedValue(new Error('主进程不可用'));
    await expect(loadAppInfo()).rejects.toThrow('主进程不可用');
  });
});
