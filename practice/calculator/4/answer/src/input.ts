import { Operand, NumberOperand } from './operand';
import { Operator, Equal } from './operator';

export class CalculatorInput {
  private defaultOperand: Operand;
  private inputing: (Operand | Operator)[];

  constructor(defaultOperand?: Operand) {
    this.defaultOperand = defaultOperand || new NumberOperand(0);
    this.inputing = [this.defaultOperand];
  }

  public append(input: Operand | Operator): boolean {
    const lastIndex = this.inputing.length - 1;
    const lastInput = this.inputing[lastIndex];
    if (lastInput instanceof Operator && lastInput.getType() === 0) {
      this.inputing = [this.defaultOperand];
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
    } else if (input instanceof Operand) {
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
          this.inputing.splice(this.inputing.length - 1, 1);
          return true;
        } else {
          this.inputing[this.inputing.length - 1] = newOperand;
          return newOperand !== lastInput;
        }
      } else {
        this.inputing.splice(this.inputing.length - 1, 1);
        return true;
      }
    }
    return false;
  }

  public clear() {
    this.inputing = [this.defaultOperand];
  }

  public save(): CalculatorInputSnapshot {
    const inputing = this.inputing.splice(0);
    return (input: CalculatorInput) => {
      input.inputing = inputing;
    };
  }

  public restore(snapshot: CalculatorInputSnapshot) {
    snapshot(this);
  }

  public toCalculation(): (number | Operator)[] {
    return [];
  }
}

export interface CalculatorInputSnapshot {
  (input: CalculatorInput): void;
}

export abstract class CalculatorCommand {
  protected input?: CalculatorInput;
  protected snapshot?: CalculatorInputSnapshot;

  constructor() {}

  public setInput(input: CalculatorInput) {
    this.input = input;
  }

  public saveSnapshot(): void {
    this.snapshot = this.input?.save();
  }

  public undo() {
    if (this.snapshot) {
      this.input?.restore(this.snapshot);
    }
  }

  public abstract execute(): void;
}

export class CommandHistory {}

export class NumberCommand extends CalculatorCommand {
  private value: NumberOperand;

  constructor(value: number) {
    super();
    this.value = new NumberOperand(value);
  }

  public execute(): void {
    if (this.input) {
      this.saveSnapshot();
      this.input.append(this.value);
    }
  }
}

export class OperatorCommand extends CalculatorCommand {
  private value: Operator;

  constructor(value: Operator) {
    super();
    this.value = value;
  }

  public execute(): void {
    if (this.input) {
      this.saveSnapshot();
      this.input.append(this.value);
    }
  }
}

export class ClearCommand extends CalculatorCommand {
  public execute(): void {
    if (this.input) {
      this.saveSnapshot();
      this.input.clear();
    }
  }
}

export class EqualCommand extends CalculatorCommand {
  private value = new Equal();

  public execute(): void {
    if (this.input) {
      this.saveSnapshot();
      this.input.append(this.value);
    }
  }
}

export class UndoCommand extends CalculatorCommand {
  private history: CalculatorCommandHistory;

  constructor(history: CalculatorCommandHistory) {
    super();
    this.history = history;
  }

  public execute(): void {
    this.history.undo()
  }
}

export class RedoCommand extends CalculatorCommand {
  private history: CalculatorCommandHistory;

  constructor(history: CalculatorCommandHistory) {
    super();
    this.history = history;
  }

  public execute(): void {
    this.history.redo()
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
      this.index -= 1;
      command.undo();
    }
  }

  public redo() {
    if (this.index < this.history.length - 1) {
      this.index += 1;
      const command = this.history[this.index];
      command.undo();
    }
  }
}
