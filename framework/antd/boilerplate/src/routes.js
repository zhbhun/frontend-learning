import React from 'react';
import { Route } from 'react-router';
import {
  ButtonDemo,
  InputDemo,
  InputNumberDemo,
  DatePickerDemo,
  DropdownDemo,
  TimePickerDemo,
  SelectDemo,
  TreeSelectDemo,
  RadioDemo,
  MenuDemo,
  ModalDemo,
} from 'antd-demo';

import App from './App';

const {
  ButtonTypeDemo,
  IconButtonDemo,
  ButtonSizeDemo,
  DisableButtonDemo,
  LoadingButtonDemo,
  CompositeButtonDemo,
} = ButtonDemo;
const {
  InputSizeDemo,
  InputAddonDemo,
  InputGroupDemo,
} = InputDemo;
const { DatePickerSizeDemo } = DatePickerDemo;
const { DropdownButtonDemo } = DropdownDemo;
const { InputNumberSizeDemo } = InputNumberDemo;
const { SelectSizeDemo } = SelectDemo;
const { TreeSelectBasicDemo } = TreeSelectDemo;
const { RadioButtonSizeDemo } = RadioDemo;
const { TimePickerSizeDemo } = TimePickerDemo;
const { ModalBasicDemo } = ModalDemo;
const {
  HorizontalMenuDemo,
  InlineMenuDemo,
  VerticalMenuDemo,
} = MenuDemo;

export default (
  <Route path="/" component={App}>
    {/* 按钮 */}
    <Route path="button/type" component={ButtonTypeDemo} />
    <Route path="button/icon" component={IconButtonDemo} />
    <Route path="button/size" component={ButtonSizeDemo} />
    <Route path="button/disable" component={DisableButtonDemo} />
    <Route path="button/loading" component={LoadingButtonDemo} />
    <Route path="button/composite" component={CompositeButtonDemo} />
    {/* 输入框 */}
    <Route path="input/size" component={InputSizeDemo} />
    <Route path="input/addon" component={InputAddonDemo} />
    <Route path="input/group" component={InputGroupDemo} />
    {/* 数字输入框 */}
    <Route path="input-number/size" component={InputNumberSizeDemo} />
    {/* 单选框 */}
    <Route path="radio/size" component={RadioButtonSizeDemo} />
    {/* 选择器 */}
    <Route path="select/size" component={SelectSizeDemo} />
    {/* 选择器 */}
    <Route path="tree-select/basic" component={TreeSelectBasicDemo} />
    {/* 日期 */}
    <Route path="datepicker/size" component={DatePickerSizeDemo} />
    {/* 时间 */}
    <Route path="timepicker/size" component={TimePickerSizeDemo} />
    {/* 对话框 */}
    <Route path="modal/basic" component={ModalBasicDemo} />
    {/* 下拉菜单 */}
    <Route path="dropdown/button" component={DropdownButtonDemo} />
    {/* 导航菜单 */}
    <Route path="menu/horizontal" component={HorizontalMenuDemo} />
    <Route path="menu/inline" component={InlineMenuDemo} />
    <Route path="menu/vertical" component={VerticalMenuDemo} />
  </Route>
);
