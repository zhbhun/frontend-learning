class CalculatorPlugin {
  calculator: Calculator;
  constructor(calculator: Calculator) {
    this.calculator = calculator;
  }

  before() {}

  after() {}
}

class CalculatorOperantPlugin extends CalculatorPlugin {
  after() {
    if (
      this.calculator.state instanceof CalculatorOperatorState &&
      this.calculator.value !== this.calculator.tempValue
    ) {
      this.calculator.value = this.calculator.tempValue;
    }
  }
}

class CalculatorPlusPlugin extends CalculatorOperantPlugin {
  after() {
    super.after();
    if (this.calculator.state instanceof CalculatorOperandState) {
      this.calculator.tempValue =
        this.calculator.value + Number(this.calculator.operant);
    }
  }
}

class CalculatorEqualPlugin extends CalculatorOperantPlugin {
  after() {
    super.after();
    if (this.calculator.state instanceof CalculatorOperandState) {
      const value = this.calculator.value + Number(this.calculator.operant);
      this.calculator.value = value;
      this.calculator.tempValue = value;
    }
  }
}

/**
 * - 空状态
 * - 计算符号
 * - 数值输入
 */
class CalculatorState {
  calculator: Calculator;
  constructor(calculator: Calculator) {
    this.calculator = calculator;
  }

  press(input: string) {}
}

class CalculatorEmptyState extends CalculatorState {
  constructor(calculator: Calculator) {
    super(calculator);
  }
  press(input: string) {
    if (input === "+" || input === "-" || input === "*" || input === "/") {
      this.calculator.operator = input;
      this.calculator.state = new CalculatorOperatorState(this.calculator);
    } else if (/\d/.test(input)) {
      this.calculator.operant += `${this.calculator.operant}${input}`;
      this.calculator.state = new CalculatorOperandState(this.calculator);
    } else if (input === "=") {
      // ignore
    }
  }
}

class CalculatorOperatorState extends CalculatorState {
  constructor(calculator: Calculator) {
    super(calculator);
  }
  press(input: string) {
    if (input === "+" || input === "-" || input === "*" || input === "/") {
      this.calculator.operator = input;
      this.calculator.state = new CalculatorOperatorState(this.calculator);
    } else if (/\d/.test(input)) {
      this.calculator.operant += `${this.calculator.operant}${input}`;
    } else if (input === "=") {
      // ignore
    }
  }
}

class CalculatorOperandState extends CalculatorState {
  constructor(calculator: Calculator) {
    super(calculator);
  }
  press(input: string) {
    if (input === "+" || input === "-" || input === "*" || input === "/") {
      this.calculator.operator = input;
    } else if (/\d/.test(input)) {
      this.calculator.operant += `${this.calculator.operant}${input}`;
      this.calculator.state = new CalculatorOperandState(this.calculator);
    } else if (input === "=") {
      this.calculator.state = new CalculatorEmptyState(this.calculator);
    }
  }
}

class Calculator {
  plugins: CalculatorPlugin[];
  state: CalculatorState;
  value: number;
  operant: string;
  operator: string;
  tempValue: number;

  constructor(value) {
    this.plugins = [];
    this.state = new CalculatorEmptyState(this);
    this.value = 0;
    this.operant = "";
  }

  press(input: string) {
    this.plugins.forEach((plugin) => {
      plugin.before();
    });
    this.state.press(input);
    this.plugins.forEach((plugin) => {
      plugin.after();
    });
  }

  print() {
    console.log(">>", this.value, this.tempValue);
  }

  register(plugin: CalculatorPlugin) {
    this.plugins.push(plugin);
  }
}

const calculator = new Calculator(0);

calculator.register(new CalculatorPlusPlugin(calculator));

calculator.press("1");
