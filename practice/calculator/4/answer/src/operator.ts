/**
 * 操作符类型
 *
 * - 0：特指等号，无操作数且终止计算符
 * - 1：单个操作数，例如：开根号、lg 和 ln
 * - 2：两个操作数，例如：加减乘除
 */
export type OperatorType = 0 | 1 | 2;

/**
 * 操作符优先级
 *
 * - 0：无优先级，也可以认为最低优先级
 * - 1：第一优先级，例如：括号
 * - 2：第二优先级，例如：负号运算符、开根号
 * - 3：第三优先级，例如：乘除
 * - 4：第四优先级，例如：加减
 */
export type OperatorPriority = 0 | 1 | 2 | 3 | 4;

export abstract class Operator {
  /**
   *
   * @param operator1 操作符 1
   * @param operator2
   * @returns
   */
  static compare(operator1: Operator, operator2: Operator) {
    return operator1.getPriority() - operator2.getPriority() < 0;
  }

  public abstract getType(): OperatorType;

  public abstract getPriority(): OperatorPriority;

  // public abstract compute(...args: number[]): number;
  public abstract compute(operand1?: number, operand2?: number): number;

  public toString() {
    return '';
  }
}

export class Equal extends Operator {
  private static instance: Equal;

  static getInstance() {
    if (!Equal.instance) {
      Equal.instance = new Equal();
    }
    return Equal.instance;
  }

  public getType(): OperatorType {
    return 0;
  }

  public getPriority(): OperatorPriority {
    return 0;
  }

  public compute(operand: number): number {
    return operand;
  }

  public toString() {
    return '=';
  }
}

export class Plus extends Operator {
  private static instance: Plus;

  static getInstance() {
    if (!Plus.instance) {
      Plus.instance = new Plus();
    }
    return Plus.instance;
  }

  public getType(): OperatorType {
    return 2;
  }

  public getPriority(): OperatorPriority {
    return 4;
  }

  public compute(operand1: number, operand2: number): number {
    return operand1 + operand2;
  }

  public toString() {
    return '+';
  }
}

export class Minus extends Operator {
  private static instance: Minus;

  static getInstance() {
    if (!Minus.instance) {
      Minus.instance = new Minus();
    }
    return Minus.instance;
  }

  public getType(): OperatorType {
    return 2;
  }

  public getPriority(): OperatorPriority {
    return 4;
  }

  public compute(operand1: number, operand2: number): number {
    return operand1 - operand2;
  }

  public toString() {
    return '-';
  }
}

export class Multiply extends Operator {
  private static instance: Multiply;

  static getInstance() {
    if (!Multiply.instance) {
      Multiply.instance = new Multiply();
    }
    return Multiply.instance;
  }

  public getType(): OperatorType {
    return 2;
  }

  public getPriority(): OperatorPriority {
    return 3;
  }

  public compute(operand1: number, operand2: number): number {
    return operand1 * operand2;
  }

  public toString() {
    return '×';
  }
}

export class Divide extends Operator {
  private static instance: Divide;

  static getInstance() {
    if (!Divide.instance) {
      Divide.instance = new Divide();
    }
    return Divide.instance;
  }

  public getType(): OperatorType {
    return 2;
  }

  public getPriority(): OperatorPriority {
    return 3;
  }
  public compute(operand1: number, operand2: number): number {
    return operand1 / operand2;
  }

  public toString() {
    return '÷';
  }
}

export class Mode extends Operator {
  private static instance: Mode;

  static getInstance() {
    if (!Mode.instance) {
      Mode.instance = new Mode();
    }
    return Mode.instance;
  }

  public getType(): OperatorType {
    return 2;
  }

  public getPriority(): OperatorPriority {
    return 3;
  }

  public compute(operand1: number, operand2: number): number {
    return operand1 % operand2;
  }

  public toString() {
    return '%';
  }
}
