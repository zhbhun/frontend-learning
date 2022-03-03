import React from 'react';
import { Input, Col } from 'antd';

const InputGroup = Input.Group;

export default function InputGroupDemo() {
  return (
    <div>
      <InputGroup size="large">
        <Col span="4">
          <Input defaultValue="0571" />
        </Col>
        <Col span="8">
          <Input defaultValue="26888888" />
        </Col>
      </InputGroup>
      <InputGroup>
        <Col span="4">
          <Input defaultValue="0571" />
        </Col>
        <Col span="8">
          <Input defaultValue="26888888" />
        </Col>
      </InputGroup>
      <InputGroup size="small">
        <Col span="4">
          <Input defaultValue="0571" />
        </Col>
        <Col span="8">
          <Input defaultValue="26888888" />
        </Col>
      </InputGroup>
    </div>
  );
}
