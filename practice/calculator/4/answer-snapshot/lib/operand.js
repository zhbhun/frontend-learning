"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberOperand = exports.Operand = void 0;
class Operand {
    append(operand) {
        if (this.isSeald() || operand.isSeald()) {
            if (this.valueOf() === operand.valueOf()) {
                return this;
            }
            return operand;
        }
        if (!this.isExtensible()) {
            return this;
        }
        const currValue = this.valueOf();
        const appedValue = operand.valueOf();
        if (currValue === 0) {
            if (appedValue === 0) {
                return this;
            }
            return operand;
        }
        return new NumberOperand(Number(String(currValue) + String(appedValue)));
    }
    delete() {
        if (this.isSeald()) {
            return null;
        }
        else {
            const value = String(this.valueOf());
            if (value.length === 1) {
                return null;
            }
            else {
                return new NumberOperand(Number(value.substring(0, value.length - 1)));
            }
        }
    }
}
exports.Operand = Operand;
class NumberOperand extends Operand {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
    isSeald() {
        return false;
    }
    isExtensible() {
        // TODO: 注意科学计数法
        return this.value.toString().length < 8;
    }
    valueOf() {
        return this.value;
    }
}
exports.NumberOperand = NumberOperand;
//# sourceMappingURL=operand.js.map