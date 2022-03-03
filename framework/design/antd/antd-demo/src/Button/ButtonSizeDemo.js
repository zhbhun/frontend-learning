import React from 'react';
import { Button } from 'antd';

/*
按钮有大、中、小三种尺寸。
通过设置 size 为 large small 分别把按钮设为大、小尺寸。若不设置 size，则尺寸为中。
 */
export default function ButtonSizeDemo() {
  return (
    <div>
      <Button type="primary" size="large">Large</Button>
      <Button type="primary">Default</Button>
      <Button type="primary" size="small">Small</Button>
    </div>
  );
}
