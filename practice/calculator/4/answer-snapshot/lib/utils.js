import { NumberOperand } from './operand';
import { Plus, Minus, Multiply, Divide } from './operator';
const operators = [
    Plus.getInstance(),
    Minus.getInstance(),
    Multiply.getInstance(),
    Divide.getInstance(),
];
export function randomOperator() {
    return operators[Math.floor(Math.random() * operators.length)];
}
export function randomOperand() {
    return new NumberOperand(Math.floor(1 + Math.random() * 100));
}
export function randomInput(size = 1000000) {
    let inputing = [randomOperand()];
    for (let index = 0; index < size; index++) {
        inputing.push(randomOperator());
        inputing.push(randomOperand());
    }
    return inputing;
}
//# sourceMappingURL=utils.js.map