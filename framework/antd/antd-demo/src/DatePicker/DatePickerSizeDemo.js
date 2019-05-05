import React from 'react';
import { DatePicker } from 'antd';

/*
三种大小的输入框，大的用在表单中，中的为默认。
 */
export default function DatePickerSizeDemo() {
  return (
    <div>
      <DatePicker size="large" />
      <br />
      <DatePicker />
      <br />
      <DatePicker size="small" />
    </div>
  );
}
