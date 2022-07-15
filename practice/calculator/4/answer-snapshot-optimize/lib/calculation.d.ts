import { Operand } from './operand';
import { Operator } from './operator';
export declare abstract class Calculation {
    abstract compute(expression: (Operand | Operator)[]): number;
}
export declare class ElementaryCalculation extends Calculation {
    compute(input: (Operand | Operator)[]): number;
}
