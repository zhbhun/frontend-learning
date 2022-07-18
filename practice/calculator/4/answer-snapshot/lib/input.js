"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculatorCommandHistory = exports.RedoCommand = exports.UndoCommand = exports.DeleteCommand = exports.ClearCommand = exports.EqualCommand = exports.OperatorCommand = exports.OperandCommand = exports.CalculatorCommand = exports.ElementaryCalculatorInput = exports.CalculatorInput = void 0;
const operand_1 = require("./operand");
const operator_1 = require("./operator");
class CalculatorInput {
    defaultOperand;
    inputing;
    constructor(defaultOperand) {
        this.defaultOperand = defaultOperand || new operand_1.NumberOperand(0);
        this.inputing = [this.defaultOperand];
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
exports.CalculatorInput = CalculatorInput;
class ElementaryCalculatorInput extends CalculatorInput {
    append(input) {
        const lastIndex = this.inputing.length - 1;
        const lastInput = this.inputing[lastIndex];
        if (lastInput instanceof operator_1.Operator && lastInput.getType() === 0) {
            this.inputing = [this.defaultOperand];
        }
        if (input instanceof operand_1.Operand) {
            if (lastInput instanceof operand_1.Operand) {
                const newOperand = lastInput.append(input);
                this.inputing[lastIndex] = newOperand;
                return newOperand !== lastInput;
            }
            else {
                this.inputing.push(input);
                return true;
            }
        }
        else if (input instanceof operator_1.Operator) {
            if (input.getType() === 0) {
                this.inputing.push(input);
                return true;
            }
            else if (input.getType() === 1) {
                if (lastInput === this.defaultOperand) {
                    this.inputing[lastIndex] = input;
                }
                else if (lastInput instanceof operator_1.Operator && lastInput.getType() === 2) {
                    this.inputing.push(input);
                }
                else {
                    return false;
                }
            }
            else if (input.getType() === 2) {
                if (lastInput instanceof operator_1.Operator && lastInput.getType() === 2) {
                    this.inputing[lastIndex] = input;
                    return lastInput !== input;
                }
                else if (lastInput instanceof operand_1.Operand) {
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
            if (lastInput instanceof operand_1.Operand) {
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
exports.ElementaryCalculatorInput = ElementaryCalculatorInput;
class CalculatorCommand {
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
exports.CalculatorCommand = CalculatorCommand;
class OperandCommand extends CalculatorCommand {
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
exports.OperandCommand = OperandCommand;
class OperatorCommand extends CalculatorCommand {
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
exports.OperatorCommand = OperatorCommand;
class EqualCommand extends CalculatorCommand {
    value = operator_1.Equal.getInstance();
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.append(this.value);
    }
}
exports.EqualCommand = EqualCommand;
class ClearCommand extends CalculatorCommand {
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.clear();
    }
}
exports.ClearCommand = ClearCommand;
class DeleteCommand extends CalculatorCommand {
    execute(calculator, input) {
        this.saveSnapshot(input);
        return input.delete();
    }
}
exports.DeleteCommand = DeleteCommand;
class UndoCommand extends CalculatorCommand {
    execute(calculator, input) {
        calculator.undo();
        return false;
    }
}
exports.UndoCommand = UndoCommand;
class RedoCommand extends CalculatorCommand {
    execute(calculator, input) {
        calculator.redo();
        return false;
    }
}
exports.RedoCommand = RedoCommand;
class CalculatorCommandHistory {
    history = [];
    index = -1;
    push(command) {
        this.index += 1;
        if (this.index > 0) {
            this.history.splice(this.index, this.history.length - this.index);
        }
        this.history.push(command);
    }
    undo() {
        if (this.index >= 0) {
            const command = this.history[this.index];
            command.restoreSnapshot();
            this.index -= 1;
        }
    }
    redo(calculator, input) {
        if (this.index < this.history.length - 1) {
            this.index += 1;
            const command = this.history[this.index];
            command.execute(calculator, input);
        }
    }
}
exports.CalculatorCommandHistory = CalculatorCommandHistory;
//# sourceMappingURL=input.js.map