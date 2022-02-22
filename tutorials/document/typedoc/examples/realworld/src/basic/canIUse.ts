/**
 * 判断小程序的API，回调，参数，组件等是否在当前版本可用。
 *
 * @param schema 使用 ${API}.${method}.${param}.${option} 或者 ${component}.${attribute}.${option} 方式来调用
 * @returns
 */
export function canIUse(schema: string): boolean {
  return true;
}
