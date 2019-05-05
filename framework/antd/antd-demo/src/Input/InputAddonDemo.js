import React from 'react';
import { Input, Select } from 'antd';

const selectBefore = (
  <Select defaultValue="Http://" style={{ width: 80 }}>
    <Option value="Http://">Http://</Option>
    <Option value="Https://">Https://</Option>
  </Select>
);

const selectAfter = (
  <Select defaultValue=".com" style={{ width: 70 }}>
    <Option value=".com">.com</Option>
    <Option value=".jp">.jp</Option>
    <Option value=".cn">.cn</Option>
    <Option value=".org">.org</Option>
  </Select>
);

const space = <div style={{ height: 40 }}></div>;

export default function InputAddonDemo() {
  return (
    <div>
      <Input size="large" addonBefore="Http://" addonAfter=".com" defaultValue="mysite" />
      <div>
        <Input addonBefore={selectBefore} addonAfter={selectAfter} defaultValue="mysite" />
      </div>
      {space}
      <Input addonBefore="Http://" addonAfter=".com" defaultValue="mysite" />
      <div>
        <Input addonBefore={selectBefore} addonAfter={selectAfter} defaultValue="mysite" />
      </div>
      {space}
      <Input size="small" addonBefore="Http://" addonAfter=".com" defaultValue="mysite" />
      <div>
        <Input size="small" addonBefore={selectBefore} addonAfter={selectAfter} defaultValue="mysite" />
      </div>
    </div>
  );
}
