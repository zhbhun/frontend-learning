import {
  Calculator,
  DeleteCommand,
  OperandCommand,
  OperatorCommand,
  NumberOperand,
  Multiply,
  Plus,
  Equal,
} from './index';

const calculator = new Calculator();

calculator
  .press(new OperandCommand(new NumberOperand(3)))
  .press(new OperatorCommand(Plus.getInstance()))
  .press(new OperandCommand(new NumberOperand(4)))
  .press(new OperatorCommand(Multiply.getInstance()))
  .press(new OperandCommand(new NumberOperand(5)));

console.log(calculator.toString(), '=', calculator.compute());

calculator.undo().undo();

console.log(calculator.toString(), '=', calculator.compute());

calculator.redo().redo();

console.log(calculator.toString(), '=', calculator.compute());

calculator.press(new DeleteCommand()).press(new DeleteCommand());

console.log(calculator.toString(), '=', calculator.compute());

calculator.undo().undo();

console.log(calculator.toString(), '=', calculator.compute());
