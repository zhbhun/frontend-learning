import { Calculation } from './calculation';
import { CalculatorCommand, CalculatorCommandHistory, CalculatorInput } from './input';
import { Operand } from './operand';
import { Operator } from './operator';
export declare class Calculator {
    protected calculation: Calculation;
    protected input: CalculatorInput;
    protected history: CalculatorCommandHistory;
    constructor(options: {
        calculation: Calculation;
        input: CalculatorInput;
    });
    press(commmand: CalculatorCommand): Calculator;
    undo(): Calculator;
    redo(): Calculator;
    compute(): number;
    toString(): string;
}
export declare class ElementaryCalculator extends Calculator {
    constructor(options?: {
        defaultOperand?: Operand;
        initialInputs?: (Operand | Operator)[];
    });
}
