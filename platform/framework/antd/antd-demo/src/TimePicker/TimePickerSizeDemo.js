import React from 'react';
import { TimePicker } from 'antd';

import Space from '../component/Space';

export default function TimePickerSizeDemo() {
  return (
    <div>
      <TimePicker defaultValue="12:08:23" size="large" />
      <Space />
      <TimePicker defaultValue="12:08:23" />
      <Space />
      <TimePicker defaultValue="12:08:23" size="small" />
    </div>
  );
}
