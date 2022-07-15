import { Calculation, ElementaryCalculation } from './calculation';
import {
  CalculatorCommand,
  CalculatorCommandHistory,
  CalculatorInput,
} from './input';
import { Operand } from './operand';
import { Operator } from './operator';

export class Calculator {
  private input: CalculatorInput;
  private history: CalculatorCommandHistory;
  private calculation: Calculation;

  constructor(options?: { calculation?: Calculation; initial?: Operand }) {
    this.calculation = options?.calculation || new ElementaryCalculation();
    this.history = new CalculatorCommandHistory();
    this.input = new CalculatorInput(options?.initial);
  }

  public press(commmand: CalculatorCommand): Calculator {
    const shouldSave = commmand.execute(this, this.input);
    if (shouldSave) {
      this.history.push(commmand);
    }
    return this;
  }

  public undo(): Calculator {
    this.history.undo();
    return this;
  }

  public redo(): Calculator {
    this.history.redo(this, this.input);
    return this;
  }

  public compute(): number {
    return this.calculation.compute(this.input.getInputing());
  }

  public toString(): string {
    const inputing = this.input.getInputing();
    return inputing
      .map((item) => {
        if (item instanceof Operand) {
          return String(Number(item));
        } else if (item instanceof Operator) {
          return String(item);
        }
        return '';
      })
      .join(' ');
  }
}
