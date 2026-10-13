/*
 * react-dom 19 未随包发布类型声明，本工作区也没有安装 @types/react-dom；
 * 这里只为课程实验台声明实际用到的最小入口，让 `react-dom/client` 的导入
 * 通过类型检查。运行时仍解析到 react-dom 包的真实 client 入口。
 */
declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(node: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: HTMLElement): Root;
}
