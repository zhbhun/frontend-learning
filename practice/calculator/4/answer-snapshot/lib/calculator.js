"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calculator = void 0;
const calculation_1 = require("./calculation");
const input_1 = require("./input");
const operand_1 = require("./operand");
const operator_1 = require("./operator");
class Calculator {
    input;
    history;
    calculation;
    constructor(options) {
        this.calculation = options?.calculation || new calculation_1.ElementaryCalculation();
        this.history = new input_1.CalculatorCommandHistory();
        this.input = new input_1.CalculatorInput(options?.initial);
    }
    press(commmand) {
        const shouldSave = commmand.execute(this, this.input);
        if (shouldSave) {
            this.history.push(commmand);
        }
        return this;
    }
    undo() {
        this.history.undo();
        return this;
    }
    redo() {
        this.history.redo(this, this.input);
        return this;
    }
    compute() {
        return this.calculation.compute(this.input.getInputing());
    }
    toString() {
        const inputing = this.input.getInputing();
        return inputing
            .map((item) => {
            if (item instanceof operand_1.Operand) {
                return String(Number(item));
            }
            else if (item instanceof operator_1.Operator) {
                return String(item);
            }
            return '';
        })
            .join(' ');
    }
}
exports.Calculator = Calculator;
//# sourceMappingURL=calculator.js.map