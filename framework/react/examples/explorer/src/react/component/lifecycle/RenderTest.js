/**
 * 组件可渲染的数据类型，即 render 返回值类型
 */
import React, { Fragment } from 'react';
import Page from '../../../Page';
import ErrorBoundary from '../../../ErrorBoundary';

const UndefinedTest = () => undefined;
const NullTest = () => null;
const TrueTest = () => true;
const FalseTest = () => false;
const NumberTest = () => 100;
const StringTest = () => 'Hello World!';
const ObjectTest = () => ({});
const ArrayTest = () => ['a', 'b', 'c'];
const FragmentTest = () => (
  <Fragment>
    <span>a</span>
    <span>b</span>
    <span>c</span>
  </Fragment>
)
const FunctionTest = () => () => null;

const RenderTest = () => (
  <ul>
    <li>
      <span>undefined: </span>
      <ErrorBoundary>
        <UndefinedTest />
      </ErrorBoundary>
    </li>
    <li>
      <span>null: </span>
      <NullTest />
    </li>
    <li>
      <span>true: </span>
      <TrueTest />
    </li>
    <li>
      <span>false: </span>
      <FalseTest />
    </li>
    <li>
      <span>number: </span>
      <NumberTest />
    </li>
    <li>
      <span>string: </span>
      <StringTest />
    </li>
    <li>
      <span>object: </span>
      <ErrorBoundary>
        <ObjectTest />
      </ErrorBoundary>
    </li>
    <li>
      <span>array: </span>
      <ArrayTest />
    </li>
    <li>
      <span>fragment: </span>
      <FragmentTest />
    </li>
    <li>
      <span>function: </span>
      <FunctionTest />
    </li>
  </ul>
);

export default Page.create({
  path: 'render',
  title: 'Render',
})(RenderTest);
