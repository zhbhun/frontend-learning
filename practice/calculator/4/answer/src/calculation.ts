import { NumberOperand, Operand } from './operand';
import { Operator } from './operator';

export abstract class Calculation {
  public abstract compute(expression: (Operand | Operator)[]): number;
}

export class ElementaryCalculation extends Calculation {
  public compute(input: (Operand | Operator)[]): number {
    const expression = input.slice(0);
    let lastInput = expression[expression.length - 1];
    while (lastInput instanceof Operator) {
      expression.pop();
      lastInput = expression[expression.length - 1];
    }

    if (expression.length === 0) {
      return 0;
    }

    const inputStack: (Operand | Operator)[] = [];
    const operatorStack: Operator[] = [];

    for (let index = 0; index < expression.length; index++) {
      const item = expression[index];
      if (item instanceof Operator) {
        while (true) {
          if (operatorStack.length === 0) {
            operatorStack.push(item);
            break;
          } else {
            const lastOperator = operatorStack[operatorStack.length - 1];
            if (Operator.compare(item, lastOperator)) {
              operatorStack.push(item);
              break;
            } else {
              const operator = operatorStack.pop();
              const operand2 = inputStack.pop();
              const operand1 = inputStack.pop();
              if (operator && operand1 && operand2) {
                const result = operator.compute(
                  Number(operand1),
                  Number(operand2)
                );
                inputStack.push(new NumberOperand(result));
              }
            }
          }
        }
      } else if (item instanceof Operand) {
        inputStack.push(item);
      }
    }

    while (operatorStack.length > 0) {
      const operator = operatorStack.pop();
      const operand2 = inputStack.pop();
      const operand1 = inputStack.pop();
      if (operator && operand1 && operand2) {
        const result = operator.compute(Number(operand1), Number(operand2));
        inputStack.push(new NumberOperand(result));
      }
    }

    const result = inputStack[0];
    return result instanceof Operand ? Number(result) : 0;
  }
}
