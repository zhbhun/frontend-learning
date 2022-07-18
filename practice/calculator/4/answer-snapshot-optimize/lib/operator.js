export class Operator {
    constructor() { }
    /**
     *
     * @param operator1 操作符 1
     * @param operator2
     * @returns
     */
    static compare(operator1, operator2) {
        return operator1.getPriority() - operator2.getPriority() < 0;
    }
    toString() {
        return '';
    }
}
export class Equal extends Operator {
    static instance;
    static getInstance() {
        if (!Equal.instance) {
            Equal.instance = new Equal();
        }
        return Equal.instance;
    }
    getType() {
        return 0;
    }
    getPriority() {
        return 0;
    }
    compute(operand) {
        return operand;
    }
    toString() {
        return '=';
    }
}
export class Plus extends Operator {
    static instance;
    static getInstance() {
        if (!Plus.instance) {
            Plus.instance = new Plus();
        }
        return Plus.instance;
    }
    getType() {
        return 2;
    }
    getPriority() {
        return 4;
    }
    compute(operand1, operand2) {
        return operand1 + operand2;
    }
    toString() {
        return '+';
    }
}
export class Minus extends Operator {
    static instance;
    static getInstance() {
        if (!Minus.instance) {
            Minus.instance = new Minus();
        }
        return Minus.instance;
    }
    getType() {
        return 2;
    }
    getPriority() {
        return 4;
    }
    compute(operand1, operand2) {
        return operand1 - operand2;
    }
    toString() {
        return '-';
    }
}
export class Multiply extends Operator {
    static instance;
    static getInstance() {
        if (!Multiply.instance) {
            Multiply.instance = new Multiply();
        }
        return Multiply.instance;
    }
    getType() {
        return 2;
    }
    getPriority() {
        return 3;
    }
    compute(operand1, operand2) {
        return operand1 * operand2;
    }
    toString() {
        return '×';
    }
}
export class Divide extends Operator {
    static instance;
    static getInstance() {
        if (!Divide.instance) {
            Divide.instance = new Divide();
        }
        return Divide.instance;
    }
    getType() {
        return 2;
    }
    getPriority() {
        return 3;
    }
    compute(operand1, operand2) {
        return operand1 / operand2;
    }
    toString() {
        return '÷';
    }
}
export class Mode extends Operator {
    static instance;
    static getInstance() {
        if (!Mode.instance) {
            Mode.instance = new Mode();
        }
        return Mode.instance;
    }
    getType() {
        return 2;
    }
    getPriority() {
        return 3;
    }
    compute(operand1, operand2) {
        return operand1 % operand2;
    }
    toString() {
        return '%';
    }
}
//# sourceMappingURL=operator.js.map