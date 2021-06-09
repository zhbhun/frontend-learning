/**
 * example
 *
 * ```js
 * // example
 * example('typedoc');
 * ```
 * @example demo
 * ```js
 * // example
 * example('typedoc...');
 * ```
 * @param message - 消息
 * @returns
 */
 export function example(message: string): string {
  return `Hello ${message}!`;
}

/**
 * 版本
 *
 * @version 1.0.0
 * @returns
 */
 export function version(message: string): string {
  return `Hello ${message}!`;
}

/**
 * since
 *
 * @since 1.0.0
 * @returns
 */
 export function since(message: string): string {
  return `Hello ${message}!`;
}
