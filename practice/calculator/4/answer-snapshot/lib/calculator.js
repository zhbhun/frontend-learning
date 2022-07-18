import { ElementaryCalculation } from './calculation';
import { CalculatorCommandHistory, ElementaryCalculatorInput, } from './input';
import { Operand } from './operand';
import { Operator } from './operator';
export class Calculator {
    calculation;
    input;
    history;
    constructor(options) {
        this.calculation = options.calculation;
        this.input = options.input;
        this.history = new CalculatorCommandHistory();
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
            if (item instanceof Operand) {
                return String(Number(item));
            }
            else if (item instanceof Operator) {
                return String(item);
            }
            return '';
        })
            .join(' ');
    }
}
export class ElementaryCalculator extends Calculator {
    constructor(options) {
        const calculation = new ElementaryCalculation();
        super({
            calculation: calculation,
            input: new ElementaryCalculatorInput({
                defaultOperand: options?.defaultOperand,
                initialInputs: options?.initialInputs,
                calculation,
            }),
        });
    }
}
//# sourceMappingURL=calculator.js.map