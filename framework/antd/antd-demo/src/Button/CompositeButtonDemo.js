import React from 'react';
import { Button, Icon } from 'antd';

const ButtonGroup = Button.Group;

/*
当需要在 Button 内嵌入 Icon 时，可以设置 icon 属性，或者直接在 Button 内使用 Icon 组件。
如果想控制 Icon 具体的位置，只能直接使用 Icon 组件，而非 icon 属性。
 */
export default function CompositeButton() {
  return (
    <div>
      <h4>Basic</h4>
      <ButtonGroup>
        <Button>Cancel</Button>
        <Button type="primary">OK</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button disabled>L</Button>
        <Button disabled>M</Button>
        <Button disabled>R</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button type="primary">L</Button>
        <Button>M</Button>
        <Button type="ghost">M</Button>
        <Button type="dashed">R</Button>
      </ButtonGroup>

      <h4>With Icon</h4>
      <ButtonGroup>
        <Button type="primary">
          <Icon type="left" />Go back
        </Button>
        <Button type="primary">
          Go forward<Icon type="right" />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button type="primary" icon="cloud" />
        <Button type="primary" icon="cloud-download" />
      </ButtonGroup>

      <h4>Size</h4>
      <ButtonGroup size="large">
        <Button type="ghost">Large</Button>
        <Button type="ghost">Large</Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button type="ghost">Default</Button>
        <Button type="ghost">Default</Button>
      </ButtonGroup>
      <ButtonGroup size="small">
        <Button type="ghost">Small</Button>
        <Button type="ghost">Small</Button>
      </ButtonGroup>
    </div>
  );
}
