import { Calculation } from './calculation';
import { Calculator } from './calculator';
import { Operand, NumberOperand } from './operand';
import { Operator } from './operator';
export declare abstract class CalculatorInput {
    protected defaultOperand: Operand;
    protected inputing: (Operand | Operator)[];
    constructor(options?: {
        defaultOperand?: Operand;
        initialInputs?: (Operand | Operator)[];
    });
    getInputing(): (Operand | Operator)[];
    abstract append(input: Operand | Operator): boolean;
    abstract delete(): boolean;
    clear(): boolean;
    save(): CalculatorInputSnapshot;
    restore(snapshot: CalculatorInputSnapshot): void;
}
export interface CalculatorInputSnapshot {
    (input: CalculatorInput): void;
}
export declare class ElementaryCalculatorInput extends CalculatorInput {
    protected calculation: Calculation;
    constructor(options: {
        defaultOperand?: Operand;
        initialInputs?: (Operand | Operator)[];
        calculation: Calculation;
    });
    append(input: Operand | Operator): boolean;
    delete(): boolean;
}
export declare abstract class CalculatorCommand {
    protected input?: CalculatorInput;
    protected snapshot?: CalculatorInputSnapshot;
    /**
     * 保存快照
     * @param input
     */
    saveSnapshot(input: CalculatorInput): void;
    /**
     * 恢复快照
     * @returns 执行恢复成功
     */
    restoreSnapshot(): boolean;
    /**
     * 执行命令
     *
     * @param calculator 计算器实例
     * @param input 计算器输入
     * @return 执行是否有效，true 表示正常输入，false 表示无效或重复输入
     */
    abstract execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class OperandCommand extends CalculatorCommand {
    private value;
    constructor(value: NumberOperand);
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class OperatorCommand extends CalculatorCommand {
    private value;
    constructor(value: Operator);
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class ClearCommand extends CalculatorCommand {
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class DeleteCommand extends CalculatorCommand {
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class UndoCommand extends CalculatorCommand {
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class RedoCommand extends CalculatorCommand {
    execute(calculator: Calculator, input: CalculatorInput): boolean;
}
export declare class CalculatorCommandHistory {
    private history;
    private index;
    private delay;
    private maxLength;
    private lastTime;
    constructor(options?: {
        delay?: number;
        maxLength?: number;
    });
    push(command: CalculatorCommand): void;
    undo(): void;
    redo(calculator: Calculator, input: CalculatorInput): void;
}
