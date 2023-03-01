import React from 'react';

function Demo(props: any) {
  console.log(React.Children, props.children, React.Children.toArray(props.children));
  return <>{React.Children.count(props.children).toString()}</>;
}

function ChildrenTester() {
  return <Demo></Demo>;
}

export default ChildrenTester;
