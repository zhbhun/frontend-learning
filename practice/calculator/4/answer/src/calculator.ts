import { CalculatorCommand, CalculatorInput } from './input';

export class Calculator {
  private input: CalculatorInput;
  private history: CalculatorCommand[];

  constructor() {
    this.input = new CalculatorInput();
  }

  public press(commmand: CalculatorCommand): void {}

  public compute(): number {
    return 0;
  }

  public toString(): string {
    return '';
  }
}
