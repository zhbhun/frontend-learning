"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElementaryCalculation = exports.Calculation = void 0;
const operand_1 = require("./operand");
const operator_1 = require("./operator");
class Calculation {
}
exports.Calculation = Calculation;
class ElementaryCalculation extends Calculation {
    compute(input) {
        const expression = input.slice(0);
        let lastInput = expression[expression.length - 1];
        while (lastInput instanceof operator_1.Operator) {
            expression.pop();
            lastInput = expression[expression.length - 1];
        }
        if (expression.length === 0) {
            return 0;
        }
        const inputStack = [];
        const operatorStack = [];
        for (let index = 0; index < expression.length; index++) {
            const item = expression[index];
            if (item instanceof operator_1.Operator) {
                while (true) {
                    if (operatorStack.length === 0) {
                        operatorStack.push(item);
                        break;
                    }
                    else {
                        const lastOperator = operatorStack[operatorStack.length - 1];
                        if (operator_1.Operator.compare(item, lastOperator)) {
                            operatorStack.push(item);
                            break;
                        }
                        else {
                            const operator = operatorStack.pop();
                            const operand2 = inputStack.pop();
                            const operand1 = inputStack.pop();
                            if (operator && operand1 && operand2) {
                                const result = operator.compute(Number(operand1), Number(operand2));
                                inputStack.push(new operand_1.NumberOperand(result));
                            }
                        }
                    }
                }
            }
            else if (item instanceof operand_1.Operand) {
                inputStack.push(item);
            }
        }
        while (operatorStack.length > 0) {
            const operator = operatorStack.pop();
            const operand2 = inputStack.pop();
            const operand1 = inputStack.pop();
            if (operator && operand1 && operand2) {
                const result = operator.compute(Number(operand1), Number(operand2));
                inputStack.push(new operand_1.NumberOperand(result));
            }
        }
        const result = inputStack[0];
        return result instanceof operand_1.Operand ? Number(result) : 0;
    }
}
exports.ElementaryCalculation = ElementaryCalculation;
//# sourceMappingURL=calculation.js.map