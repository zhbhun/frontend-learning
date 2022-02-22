/**
 * 标题
 * # This is an <h1> tag
 * ## This is an <h2> tag
 * ###### This is an <h6> tag
 *
 * @returns
 */
export function head(): void {}

/**
 * [链接](https://typedoc.org/)
 *
 * @returns
 */
export function link(): void {}

/**
 * 重点
 *
 * *This text will be italic*
 * _This will also be italic_
 *
 * **This text will be bold**
 * __This will also be bold__
 *
 * _You **can** combine them_
 *
 * @returns
 */
export function emphasis(): void {}

/**
 * 列表
 *
 * 无序
 *
 * * Item 1
 * * Item 2
 *   * Item 2a
 *   * Item 2b
 *
 * 有序
 *
 * 1. Item 1
 * 2. Item 2
 * 3. Item 3
 *     1. Item 3a
 *     2. Item 3b
 * @returns
 */
export function list(): void {}

/**
 * Code blocks are great for examples
 *
 * ```typescript
 * // run typedoc --help for a list of supported languages
 * const instance = new MyClass();
 * ```
 */
export function codeBlocks(): void {}

/**
 * 表格
 *
 * First Header | Second Header
 * ------------ | -------------
 * Content from cell 1 | Content from cell 2
 * Content in the first column | Content in the second column
 */
export function table(): void {}

/**
 * Standard links:
 * {@link link} or {@linkplain link} or [[link]]
 *
 * The {@link link | link interface}
 * The [[link | link interface]]
 *
 * Code links: (Puts Foo inside `<code>` tags)
 * {@linkcode link} or [[`link`]]
 */
export function symbolReferences(): void {}

