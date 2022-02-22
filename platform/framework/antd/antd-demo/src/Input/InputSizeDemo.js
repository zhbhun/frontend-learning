import React from 'react';
import { Input } from 'antd';

export default function InputSizeDemo() {
  return (
    <div>
      <Input size="large" placeholder="大尺寸" />
      <br />
      <Input placeholder="默认尺寸" />
      <br />
      <Input size="small" placeholder="小尺寸" />
    </div>
  );
}
