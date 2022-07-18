import { Calculation } from './calculation';
import { Calculator } from './calculator';
import { Operand, NumberOperand } from './operand';
import { Operator, Equal } from './operator';

export abstract class CalculatorInput {
  protected defaultOperand: Operand;
  protected inputing: (Operand | Operator)[];

  constructor(defaultOperand?: Operand) {
    this.defaultOperand = defaultOperand || new NumberOperand(0);
    this.inputing = [this.defaultOperand];
  }

  public getInputing(): (Operand | Operator)[] {
    return this.inputing;
  }

  public abstract append(input: Operand | Operator): boolean;

  public abstract delete(): boolean;

  public clear(): boolean {
    if (
      this.inputing.length === 0 &&
      this.inputing[0] === this.defaultOperand
    ) {
      return false;
    }
    this.inputing = [this.defaultOperand];
    return true;
  }

  public save(): CalculatorInputSnapshot {
    const inputing = this.inputing.slice(0);
    return (input: CalculatorInput) => {
      input.inputing = inputing;
    };
  }

  public restore(snapshot: CalculatorInputSnapshot) {
    snapshot(this);
  }
}

export interface CalculatorInputSnapshot {
  (input: CalculatorInput): void;
}

export class ElementaryCalculatorInput extends CalculatorInput {
  protected calculation: Calculation;

  constructor(options: { defaultOperand?: Operand; calculation: Calculation }) {
    super(options.defaultOperand);
    this.calculation = options.calculation;
  }

  public append(input: Operand | Operator): boolean {
    let lastIndex = this.inputing.length - 1;
    let lastInput = this.inputing[lastIndex];
    if (lastInput instanceof Operator && lastInput.getType() === 0) {
      this.inputing = [
        new NumberOperand(this.calculation.compute(this.getInputing())),
      ];
      lastIndex = this.inputing.length - 1;
      lastInput = this.inputing[lastIndex];
    }
    if (input instanceof Operand) {
      if (lastInput instanceof Operand) {
        const newOperand = lastInput.append(input);
        this.inputing[lastIndex] = newOperand;
        return newOperand !== lastInput;
      } else {
        this.inputing.push(input);
        return true;
      }
    } else if (input instanceof Operator) {
      if (input.getType() === 0) {
        this.inputing.push(input);
        return true;
      } else if (input.getType() === 1) {
        if (lastInput === this.defaultOperand) {
          this.inputing[lastIndex] = input;
        } else if (lastInput instanceof Operator && lastInput.getType() === 2) {
          this.inputing.push(input);
        } else {
          return false;
        }
      } else if (input.getType() === 2) {
        if (lastInput instanceof Operator && lastInput.getType() === 2) {
          this.inputing[lastIndex] = input;
          return lastInput !== input;
        } else if (lastInput instanceof Operand) {
          this.inputing.push(input);
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }

  public delete(): boolean {
    if (this.inputing.length > 1) {
      const lastIndex = this.inputing.length - 1;
      const lastInput = this.inputing[lastIndex];
      if (lastInput instanceof Operand) {
        const newOperand = lastInput.delete();
        if (newOperand === null) {
          this.inputing.splice(lastIndex, 1);
          return true;
        } else {
          this.inputing[lastIndex] = newOperand;
          return newOperand !== lastInput;
        }
      } else {
        this.inputing.splice(lastIndex, 1);
        return true;
      }
    } else if (this.inputing[0] !== this.defaultOperand) {
      this.inputing.splice(0, 1, this.defaultOperand);
      return true;
    }
    return false;
  }
}

export abstract class CalculatorCommand {
  protected input?: CalculatorInput;
  protected snapshot?: CalculatorInputSnapshot;

  /**
   * 保存快照
   * @param input
   */
  public saveSnapshot(input: CalculatorInput): void {
    this.input = input;
    this.snapshot = input.save();
  }

  /**
   * 恢复快照
   * @returns 执行恢复成功
   */
  public restoreSnapshot(): boolean {
    if (this.input && this.snapshot) {
      this.input.restore(this.snapshot);
      return true;
    }
    return false;
  }

  /**
   * 执行命令
   *
   * @param calculator 计算器实例
   * @param input 计算器输入
   * @return 执行是否有效，true 表示正常输入，false 表示无效或重复输入
   */
  public abstract execute(
    calculator: Calculator,
    input: CalculatorInput
  ): boolean;
}

export class OperandCommand extends CalculatorCommand {
  private value: NumberOperand;

  constructor(value: NumberOperand) {
    super();
    this.value = value;
  }

  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    this.saveSnapshot(input);
    return input.append(this.value);
  }
}

export class OperatorCommand extends CalculatorCommand {
  private value: Operator;

  constructor(value: Operator) {
    super();
    this.value = value;
  }

  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    this.saveSnapshot(input);
    return input.append(this.value);
  }
}

export class ClearCommand extends CalculatorCommand {
  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    this.saveSnapshot(input);
    return input.clear();
  }
}

export class DeleteCommand extends CalculatorCommand {
  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    this.saveSnapshot(input);
    return input.delete();
  }
}

export class UndoCommand extends CalculatorCommand {
  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    calculator.undo();
    return false;
  }
}

export class RedoCommand extends CalculatorCommand {
  public execute(calculator: Calculator, input: CalculatorInput): boolean {
    calculator.redo();
    return false;
  }
}

export class CalculatorCommandHistory {
  private history: CalculatorCommand[] = [];
  private index = -1;

  public push(command: CalculatorCommand) {
    this.index += 1;
    if (this.index > 0) {
      this.history.splice(this.index, this.history.length - this.index);
    }
    this.history.push(command);
  }

  public undo() {
    if (this.index >= 0) {
      const command = this.history[this.index];
      command.restoreSnapshot();
      this.index -= 1;
    }
  }

  public redo(calculator: Calculator, input: CalculatorInput) {
    if (this.index < this.history.length - 1) {
      this.index += 1;
      const command = this.history[this.index];
      command.execute(calculator, input);
    }
  }
}
