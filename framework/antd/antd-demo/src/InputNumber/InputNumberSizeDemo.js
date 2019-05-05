import React from 'react';
import { InputNumber } from 'antd';

import Space from '../component/Space';

export default function InputNumberSizeDemo() {
  return (
    <div>
      <InputNumber size="large" min={1} max={100000} defaultValue={3} />
      <Space />
      <InputNumber min={1} max={100000} defaultValue={3} />
      <Space />
      <InputNumber size="small" min={1} max={100000} defaultValue={3} />
    </div>
  );
}
