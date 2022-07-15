export declare abstract class Operand {
    append(operand: Operand): Operand;
    delete(): Operand | null;
    /**
     * 是否可扩展，true 表示还可以扩展，例如：限制了最大数值的输入长度
     */
    abstract isExtensible(): boolean;
    /**
     * 是否封闭，true 不可以和其他操作数拼接，例如：π、e 等
     */
    abstract isSeald(): boolean;
    /**
     * 原始数值
     */
    abstract valueOf(): number;
}
export declare class NumberOperand extends Operand {
    private value;
    constructor(value: number);
    isSeald(): boolean;
    isExtensible(): boolean;
    valueOf(): number;
}
