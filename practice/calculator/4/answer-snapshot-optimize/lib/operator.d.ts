/**
 * 操作符类型
 *
 * - 0：特指等号，无操作数且终止计算符
 * - 1：单个操作数，例如：开根号、lg 和 ln
 * - 2：两个操作数，例如：加减乘除
 */
export declare type OperatorType = 0 | 1 | 2;
/**
 * 操作符优先级
 *
 * - 0：无优先级，也可以认为最低优先级
 * - 1：第一优先级，例如：括号
 * - 2：第二优先级，例如：负号运算符、开根号
 * - 3：第三优先级，例如：乘除
 * - 4：第四优先级，例如：加减
 */
export declare type OperatorPriority = 0 | 1 | 2 | 3 | 4;
export declare abstract class Operator {
    protected constructor();
    /**
     *
     * @param operator1 操作符 1
     * @param operator2
     * @returns
     */
    static compare(operator1: Operator, operator2: Operator): boolean;
    abstract getType(): OperatorType;
    abstract getPriority(): OperatorPriority;
    abstract compute(operand1?: number, operand2?: number): number;
    toString(): string;
}
export declare class Equal extends Operator {
    private static instance;
    static getInstance(): Equal;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand: number): number;
    toString(): string;
}
export declare class Plus extends Operator {
    private static instance;
    static getInstance(): Plus;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand1: number, operand2: number): number;
    toString(): string;
}
export declare class Minus extends Operator {
    private static instance;
    static getInstance(): Minus;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand1: number, operand2: number): number;
    toString(): string;
}
export declare class Multiply extends Operator {
    private static instance;
    static getInstance(): Multiply;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand1: number, operand2: number): number;
    toString(): string;
}
export declare class Divide extends Operator {
    private static instance;
    static getInstance(): Divide;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand1: number, operand2: number): number;
    toString(): string;
}
export declare class Mode extends Operator {
    private static instance;
    static getInstance(): Mode;
    getType(): OperatorType;
    getPriority(): OperatorPriority;
    compute(operand1: number, operand2: number): number;
    toString(): string;
}
