class CalculatorStrategy {
  execute(...operands) {
    return 0;
  }
}

class CalculatorPlusStrategy {
  execute(...operands) {
    return operands[0] + operands[1];
  }
}

class CalculatorMinusStrategy {
  execute(...operands) {
    return operands[0] - operands[1];
  }
}

class CalculatorMultiplyStrategy {
  execute(...operands) {
    return operands[0] * operands[1];
  }
}

class CalculatorDivideStrategy {
  execute(...operands) {
    return operands[0] / operands[1];
  }
}

class CalculatorCommand {
  constructor(calculator) {
    this.calculator = this.calculator;
  }

  execute() {}

  undo() {}
}

class CalculatorOperandCommand extends CalculatorCommand {
  constructor(calculator, value) {
    super(calculator)
    this.value = value
  }

  execute(input) {
    this.oeprandInputing += input;
  }

  undo() {
    this.oeprandInputing = this.oeprandInputing.substring(
      0,
      this.oeprandInputing.length - 1
    );
  }
}

class CalculatorOperatorCommand extends CalculatorCommand {
  constructor(calculator, value) {
    super(calculator)
    this.value = value
  }
  execute() {
    this.calculator.commandHistory.push(this)
  }

  undo() {
    this.oeprandInputing = this.oeprandInputing.substring(
      0,
      this.oeprandInputing.length - 1
    );
  }
}

class CalculatorPlusCommand extends CalculatorOperatorCommand {
  constructor(calculator) {
    super(calculator, 'plus')
  }
}

class CalculatorCommandHisotry {
  push()

  pop()
}

class CalculatorState {
  constructor(calculator) {
    this.calculator = this.calculator()
  }

  execute(command) {
  }

  undo(command, lastCommand) {

  }
}

class CalculatorInitialState {

}

class CalculatorOperandState {
}

class CalculatorOperatorState {
  execute(command) {
    this.calculator.expressionStack[this.calculator.expressionStack - 1] = command
  }

  undo(command, lastCommand) {
    this.calculator.expressionStack.splice(this.calculator.expressionStack.length - 1, 1)
    if (lastCommand && lastCommand instanceof CalculatorOperandCommand) {
      this.calculator.expressionStack.push(lastCommand)
      this.calculator.state = new CalculatorOperatorState()
    } else if (!lastCommand) {
      this.calculator.state = new CalculatorInitialState()
    } else {
      this.calculator.state = new CalculatorOperandState()
    }
  }

}

class Calculator {
  constructor() {
    this.oeprandInputing = "";
    this.commandHistory = new CalculatorCommandHisotry;
    this.expressionStack = [];
  }
}
