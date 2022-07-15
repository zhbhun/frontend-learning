"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const calculator = new index_1.Calculator();
calculator
    .press(new index_1.OperandCommand(new index_1.NumberOperand(3)))
    .press(new index_1.OperatorCommand(index_1.Plus.getInstance()))
    .press(new index_1.OperandCommand(new index_1.NumberOperand(4)))
    .press(new index_1.OperatorCommand(index_1.Multiply.getInstance()))
    .press(new index_1.OperandCommand(new index_1.NumberOperand(5)));
console.log(calculator.toString(), '=', calculator.compute());
calculator.undo().undo();
console.log(calculator.toString(), '=', calculator.compute());
calculator.redo().redo();
console.log(calculator.toString(), '=', calculator.compute());
calculator.press(new index_1.DeleteCommand()).press(new index_1.DeleteCommand());
console.log(calculator.toString(), '=', calculator.compute());
calculator.undo().undo();
console.log(calculator.toString(), '=', calculator.compute());
//# sourceMappingURL=test.js.map