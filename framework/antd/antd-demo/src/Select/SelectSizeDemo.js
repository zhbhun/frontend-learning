import React from 'react';
import { Select } from 'antd';

import Space from '../component/Space';

const Option = Select.Option;

function handleChange(value) {
  console.log(`selected ${value}`);
}

export default function SelectSizeDemo() {
  return (
    <div>
      <Select size="large" defaultValue="lucy" style={{ width: 200 }} onChange={handleChange}>
        <Option value="jack">Jack</Option>
        <Option value="lucy">Lucy</Option>
        <Option value="disabled" disabled>Disabled</Option>
        <Option value="yiminghe">yiminghe</Option>
      </Select>
      <Space />
      <Select defaultValue="lucy" style={{ width: 200 }} onChange={handleChange}>
        <Option value="jack">Jack</Option>
        <Option value="lucy">Lucy</Option>
        <Option value="disabled" disabled>Disabled</Option>
        <Option value="yiminghe">yiminghe</Option>
      </Select>
      <Space />
      <Select size="small" defaultValue="lucy" style={{ width: 200 }} onChange={handleChange}>
        <Option value="jack">Jack</Option>
        <Option value="lucy">Lucy</Option>
        <Option value="disabled" disabled>Disabled</Option>
        <Option value="yiminghe">yiminghe</Option>
      </Select>
    </div>
  );
}
