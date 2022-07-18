import { Calculation, ElementaryCalculation } from './calculation';
import {
  CalculatorCommand,
  CalculatorCommandHistory,
  CalculatorInput,
  ElementaryCalculatorInput,
} from './input';
import { Operand } from './operand';
import { Operator } from './operator';

export class Calculator {
  protected calculation: Calculation;
  protected input: CalculatorInput;
  protected history: CalculatorCommandHistory;

  constructor(options: { calculation: Calculation; input: CalculatorInput }) {
    this.calculation = options.calculation;
    this.input = options.input;
    this.history = new CalculatorCommandHistory();
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

export class ElementaryCalculator extends Calculator {
  constructor(initial?: Operand) {
    super({
      calculation: new ElementaryCalculation(),
      input: new ElementaryCalculatorInput(initial),
    });
  }
}
