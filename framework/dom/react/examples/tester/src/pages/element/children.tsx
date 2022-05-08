import React from "react";

function Demo(props: any) {
  console.log(React.Children, props.children);
  return <>{React.Children.count(props.children).toString()}</>;
}

function ChildrenTester() {
  return <Demo />;
}

export default ChildrenTester;
