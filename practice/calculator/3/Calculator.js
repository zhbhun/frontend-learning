/**
 * @typedef {'operand' | 'operator' | 'clear' | 'equal'} CalculatorInputType
 */

/**
 * @typedef {Object} CalculatorInput
 * @property {CalculatorInputType} type
 * @property {string | number} value
 * @property {string} display
 */

/**
 *
 * @param {number} operan1
 * @param {number} operand2
 * @param {string} operator
 * @returns
 */
function calculate(operan1, operand2, operator) {
  if (operator === "plus") {
    return operan1 + operand2;
  } else if (operator === "minus") {
    return operan1 - operand2;
  } else if (operator === "multiply") {
    return operan1 * operand2;
  } else if (operator === "divide") {
    return operan1 / operand2;
  }
  return
}

/**
 *
 * @param {CalculatorInput} input
 * @returns {number}
 */
function getOperatorPriority(input) {
  return {
    plus: 0,
    minus: 0,
    multiply: 1,
    divide: 1,
  }[input.value];
}

/**
 *
 * @param {CalculatorInput} operator1
 * @param {CalculatorInput} operator2
 * @returns
 */
function compareOperatorPriority(operator1, operator2) {
  return getOperatorPriority(operator1) - getOperatorPriority(operator2);
}

class Calculator {
  constructor() {
    /**
     * @type {CalculatorInput[]}
     */
    this._inputStack = [];
    this._operandInputing = "";
    this._equaltoPressed = false;
  }

  /**
   *
   * @returns {[CalculatorInput[], CalculatorInput | null]}
   */
  _getInput() {
    const inputStack = this._inputStack.slice(0);
    if (this._operandInputing) {
      inputStack.push({
        type: "operand",
        value: Number(this._operandInputing),
        display: this._operandInputing,
      });
    }
    let pendingOperator = null;
    if (
      inputStack.length > 0 &&
      inputStack[inputStack.length - 1].type === "operator" &&
      this._operandInputing === ""
    ) {
      // 最后一个运算符的操作数还没输入，所以暂时不纳入计算
      pendingOperator = inputStack.pop();
    }
    return [inputStack, pendingOperator];
  }

  /**
   * 接收计算器输入
   * @param {CalculatorInput} input
   */
  press(input) {
    const { type, value } = input;
    if (this._equaltoPressed) {
      this._inputStack = [];
      this._operandInputing = "0";
      this._equaltoPressed = false;
    }
    if (type === "clear") {
      this._inputStack = [];
      this._operandInputing = "0";
      this._equaltoPressed = false;
    } else if (type === "equal") {
      this._equaltoPressed = true;
    } else if (type === "operand") {
      if (this._operandInputing === "0") {
        this._operandInputing = value;
      } else {
        this._operandInputing += value;
      }
    } else if (type === "operator") {
      if (this._operandInputing === "") {
        if (
          this._inputStack.length > 0 &&
          this._inputStack[this._inputStack.length - 1].type === "operator"
        ) {
          this._inputStack[this._inputStack.length - 1] = input;
        } else {
          console.warn("can not press operator without operant");
        }
      } else {
        this._inputStack.push({
          type: "operand",
          value: Number(this._operandInputing),
          display: this._operandInputing,
        });
        this._operandInputing = "";
        this._inputStack.push(input);
      }
    }
  }

  /**
   * 计算当前输入的结果
   * @return number
   */
  compute() {
    const [inputStack] = this._getInput();
    if (inputStack.length === 0) {
      return 0;
    } else {
      /** @type  {CalculatorInput[]} */
      const expressionStack = [];
      /** @type  {CalculatorInput[]} */
      const operatorStack = [];
      for (let index = 0; index < inputStack.length; index++) {
        const input = inputStack[index];
        if (input.type === "operator") {
          while (true) {
            if (operatorStack.length === 0) {
              operatorStack.push(input);
              break;
            } else {
              const lastOperator = operatorStack[operatorStack.length - 1];
              if (compareOperatorPriority(input, lastOperator) > 0) {
                operatorStack.push(input);
                break;
              } else {
                const operator = operatorStack.pop();
                const operand2 = expressionStack.pop();
                const operand1 = expressionStack.pop();
                const result = calculate(
                  operand1.value,
                  operand2.value,
                  operator.value
                );
                expressionStack.push({
                  type: "operand",
                  value: result,
                  display: result.toString(),
                });
              }
            }
          }
        } else {
          expressionStack.push(input);
        }
      }

      while (operatorStack.length > 0) {
        const operator = operatorStack.pop();
        const operand2 = expressionStack.pop();
        const operand1 = expressionStack.pop();
        const result = calculate(
          operand1.value,
          operand2.value,
          operator.value
        );
        expressionStack.push({
          type: "operand",
          value: result,
          display: result.toString(),
        });
      }

      return (expressionStack[0] && expressionStack[0].display) || 0;
    }
  }

  /**
   * 显示当前的输入值
   *
   * @return string
   */
  display() {
    const [inputStack, pendingOperator] = this._getInput();
    let displayContent = inputStack
      .map((item) => {
        return item.display;
      })
      .join(" ");
    if (pendingOperator && !this._equaltoPressed) {
      displayContent += ` ${pendingOperator.display}`;
    } else if (this._equaltoPressed) {
      displayContent += " =";
    }
    return displayContent;
  }
}
