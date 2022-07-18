import {
  ElementaryCalculator,
  DeleteCommand,
  OperandCommand,
  OperatorCommand,
  NumberOperand,
  Multiply,
  Plus,
  Equal,
} from './index';

const calculator = new ElementaryCalculator();

calculator
  .press(new OperandCommand(new NumberOperand(3)))
  .press(new OperatorCommand(Plus.getInstance()))
  .press(new OperandCommand(new NumberOperand(4)))
  .press(new OperatorCommand(Multiply.getInstance()))
  .press(new OperandCommand(new NumberOperand(5)));

console.log('>> initial', calculator.toString(), '=', calculator.compute());

calculator.undo().undo();

console.log(
  '>> undo 2 steps:',
  calculator.toString(),
  '=',
  calculator.compute()
);

calculator.redo().redo();

console.log(
  '>> redo 2 steps:',
  calculator.toString(),
  '=',
  calculator.compute()
);

calculator.press(new DeleteCommand()).press(new DeleteCommand());

console.log(
  '>> delete 2 input:',
  calculator.toString(),
  '=',
  calculator.compute()
);

calculator.undo().undo();

console.log(
  '>> undo 2 steps:',
  calculator.toString(),
  '=',
  calculator.compute()
);

calculator.press(new OperatorCommand(Equal.getInstance()));

console.log('>> input equal:', calculator.toString(), calculator.compute());

calculator
  .press(new OperatorCommand(Plus.getInstance()))
  .press(new OperandCommand(new NumberOperand(3)));

console.log('>> input pus and 3:', calculator.toString(), '=', calculator.compute());
