import { Operand, NumberOperand } from './operand';
import { Operator } from './operator';
export class CalculatorInput {
    defaultOperand;
    inputing;
    constructor(options) {
        this.defaultOperand = options?.defaultOperand || new NumberOperand(0);
        this.inputing = options?.initialInputs ?? [this.defaultOperand];
    }
    getInputing() {
        return this.inputing;
    }
    clear() {
        if (this.inputing.length === 0 &&
            this.inputing[0] === this.defaultOperand) {
            return false;
        }
        this.inputing = [this.defaultOperand];
        return true;
    }
    save() {
        const inputing = this.inputing.slice(0);
        return (input) => {
            input.inputing = inputing;
        };
    }
    restore(snapshot) {
        snapshot(this);
    }
}
export class ElementaryCalculatorInput extends CalculatorInput {
    calculation;
    constructor(options) {
        super(options);
        this.calculation = options.calculation;
    }
    append(input) {
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
            }
            else {
                this.inputing.push(input);
                return true;
            }
        }
        else if (input instanceof Operator) {
            if (input.getType() === 0) {
                if (lastInput instanceof Operator) {
                    this.inputing[lastIndex] = input;
                }
                else {
                    this.inputing.push(input);
                }
                return true;
            }
            else if (input.getType() === 1) {
                if (lastInput === this.defaultOperand) {
                    this.inputing[lastIndex] = input;
                }
                else if (lastInput instanceof Operator && lastInput.getType() === 2) {
                    this.inputing.push(input);
                }
                else {
                    return false;
                }
            }
            else if (input.getType() === 2) {
                if (lastInput instanceof Operator && lastInput.getType() === 2) {
                    this.inputing[lastIndex] = input;
                    return lastInput !== input;
                }
                else if (lastInput instanceof Operand) {
                    this.inputing.push(input);
                    return true;
                }
                else {
                    return false;
                }
            }
        }
        return false;
    }
    delete() {
        if (this.inputing.length > 1) {
            const lastIndex = this.inputing.length - 1;
            const lastInput = this.inputing[lastIndex];
            if (lastInput instanceof Operand) {
                const newOperand = lastInput.delete();
                if (newOperand === null) {
                    this.inputing.splice(lastIndex, 1);
                    return true;
                }
                else {
                    this.inputing[lastIndex] = newOperand;
                    return newOperand !== lastInput;
                }
            }
            else {
                this.inputing.splice(lastIndex, 1);
                return true;
            }
        }
        else if (this.inputing[0] !== this.defaultOperand) {
            this.inputing.splice(0, 1, this.defaultOperand);
            return true;
        }
        return false;
    }
}
export class CalculatorCommand {
    input;
    snapshot;
    /**
     * 保存快照
     * @param input
     */
    saveSnapshot(input) {
        this.input = input;
        this.snapshot = input.save();
    }
    /**
     * 恢复快照
     * @returns 执行恢复成功
     */
    restoreSnapshot() {
        if (this.input && this.snapshot) {
            this.input.restore(this.snapshot);
            return true;
        }
        return false;
    }
}
export class OperandCommand extends CalculatorCommand {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.append(this.value);
    }
}
export class OperatorCommand extends CalculatorCommand {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.append(this.value);
    }
}
export class ClearCommand extends CalculatorCommand {
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.clear();
    }
}
export class DeleteCommand extends CalculatorCommand {
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.delete();
    }
}
export class UndoCommand extends CalculatorCommand {
    execute(calculator, input) {
        calculator.undo();
        return false;
    }
}
export class RedoCommand extends CalculatorCommand {
    execute(calculator, input) {
        calculator.redo();
        return false;
    }
}
export class CalculatorCommandHistory {
    history = [];
    index = -1;
    delay;
    maxLength;
    lastTime = 0;
    constructor(options) {
        this.delay = options?.delay ?? 50;
        this.maxLength = options?.maxLength ?? 100;
    }
    push(command) {
        const now = Date.now();
        if (now - this.lastTime < this.delay && this.index >= 0) {
            this.history[this.index] = command;
        }
        else {
            this.lastTime = now;
            this.index += 1;
            if (this.index !== this.history.length) {
                this.history.splice(this.index, this.history.length - this.index);
            }
            this.history.push(command);
            if (this.history.length > this.maxLength) {
                this.history.shift();
                this.index -= 1;
            }
        }
    }
    undo() {
        if (this.index >= 0) {
            this.lastTime = 0;
            const command = this.history[this.index];
            command.restoreSnapshot();
            this.index -= 1;
        }
    }
    redo(calculator, input) {
        if (this.index < this.history.length - 1) {
            this.lastTime = 0;
            this.index += 1;
            const command = this.history[this.index];
            command.execute(calculator, input);
        }
    }
}
//# sourceMappingURL=input.js.map