export abstract class Operand {
  public append(operand: Operand): Operand {
    if (this.isSeald() || operand.isSeald()) {
      if (this.valueOf() === operand.valueOf()) {
        return this;
      }
      return operand;
    }
    if (!this.isExtensible()) {
      return this;
    }
    const currValue = this.valueOf();
    const appedValue = operand.valueOf();
    if (currValue === 0) {
      if (appedValue === 0) {
        return this;
      }
      return operand;
    }
    return new NumberOperand(Number(String(currValue) + String(appedValue)));
  }

  public delete(): Operand | null {
    if (this.isSeald()) {
      return null;
    } else {
      const value = String(this.valueOf());
      if (value.length === 0) {
        return null;
      } else {
        return new NumberOperand(Number(value.substring(0, value.length - 1)));
      }
    }
  }

  /**
   * 是否可扩展，true 表示还可以扩展
   */
  public abstract isExtensible(): boolean;

  /**
   * 是否封闭，true 不可以和其他操作数拼接
   */
  public abstract isSeald(): boolean;

  /**
   * 原始数值
   */
  public abstract valueOf(): number;
}

export class NumberOperand extends Operand {
  private value: number;

  constructor(value: number) {
    super();
    this.value = value;
  }

  public isSeald(): boolean {
    return false;
  }

  public isExtensible(): boolean {
    // TODO: 注意科学计数法
    return this.value.toString().length < 8;
  }

  public valueOf() {
    return this.value;
  }
}
