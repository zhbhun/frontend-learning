import React from 'react';
import { Button } from 'antd';

/*
当需要在 Button 内嵌入 Icon 时，可以设置 icon 属性，或者直接在 Button 内使用 Icon 组件。
如果想控制 Icon 具体的位置，只能直接使用 Icon 组件，而非 icon 属性。
 */
export default function IconButtonDemo() {
  return (
    <div>
      <Button type="primary" shape="circle" icon="search" />
      <Button type="primary" icon="search">搜索</Button>
      <br />
      <Button type="ghost" shape="circle-outline" icon="search" />
      <Button type="ghost" icon="search">Search</Button>
    </div>
  );
}
