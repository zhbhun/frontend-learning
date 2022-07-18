import { NumberOperand, Operand } from './operand';
import { Operator } from './operator';
export declare function randomOperator(): Operator;
export declare function randomOperand(): NumberOperand;
export declare function randomInput(size?: number): (Operand | Operator)[];
