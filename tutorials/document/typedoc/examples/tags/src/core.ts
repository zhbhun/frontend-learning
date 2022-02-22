/**
 *
 * @module tags
 */


/**
 * param
 *
 * @param message - 消息
 * @returns
 */
 export function param(message: string): string {
  return `Hello ${message}!`;
}

/**
 * typeParam
 *
 * @typeParam T - Comment for type `T`.
 * @param message - 消息
 * @returns
 */
 export function typeParam<T>(message: T): string {
  return `Hello ${message}!`;
}

/**
 * returns
 *
 * @returns Comment for special return value.
 */
 export function returns(): string {
  return 'Hello';
}

/**
 * event
 *
 * @event click - Comment for click.
 */
 export function events(): void {}

/**
 * category
 *
 * @category Basic
 */
 export function category(): void {}

/**
 * hidden
 *
 * @hidden
 */
 export function hidden(): void {}
