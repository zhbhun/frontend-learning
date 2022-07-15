import { Calculation } from './calculation';
import { CalculatorCommand } from './input';
import { Operand } from './operand';
export declare class Calculator {
    private input;
    private history;
    private calculation;
    constructor(options?: {
        calculation?: Calculation;
        initial?: Operand;
    });
    press(commmand: CalculatorCommand): Calculator;
    undo(): Calculator;
    redo(): Calculator;
    compute(): number;
    toString(): string;
}
