import React from 'react';
import { Button } from 'antd';

/*
添加 disabled 属性即可让按钮处于不可用状态，同时按钮样式也会改变。
 */
export default function DisableButtonDemo() {
  return (
    <div>
      <Button type="primary">Primary</Button>
      <Button type="primary" disabled>Primary(disabled)</Button>
      <br />
      <Button>Default</Button>
      <Button disabled>Default(disabled)</Button>
      <br />
      <Button type="ghost">Ghost</Button>
      <Button type="ghost" disabled>Ghost(disabled)</Button>
      <br />
      <Button type="dashed">Dashed</Button>
      <Button type="dashed" disabled>Dashed(disabled)</Button>
    </div>
  );
}
