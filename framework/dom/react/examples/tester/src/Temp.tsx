import { Component, ComponentProps } from "react";

interface TempProps {
  name: string;
}

interface TempState {
  sex: string;
}

class Temp1 extends Component<TempProps, TempState> {
  render() {
    return <Temp2 name="" />;
  }
}

function Temp2(props: TempProps) {
  return null;
}

const a: string = "";
type b = typeof a;

type x = typeof Temp1;


type y1 = ComponentProps<x>;
type y2 = ComponentProps<'a'>;

type z = keyof JSX.IntrinsicElements
