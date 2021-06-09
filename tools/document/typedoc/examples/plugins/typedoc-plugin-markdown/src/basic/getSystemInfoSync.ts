export interface SystemInfo {
  /**
   * 设备品牌
   */
  brand: string;
  /**
   * 设备型号。新机型刚推出一段时间会显示unknown，微信会尽快进行适配。
   */
  model: string;
}

/**
 * 同步获取系统信息。
 *
 * @returns
 */
export function getSystemInfoSync(): SystemInfo {
  return {
    brand: 'xiaomi',
    model: '10',
  };
}
