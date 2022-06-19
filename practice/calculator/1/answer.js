//
/**
 * 前缀：3 + 4 * 5
 * 后缀：345*+
 * 前缀：+*543
 */

const operandRegExp = /^[0-9]+$/;
const operatorRegExp = /\+|\-|\*|\//;
const compareOperatorPriority = (operator1, operator2) => {
  const operator1Priority = operator1 === "*" || operator1 === "/" ? 1 : 0;
  const operator2Priority = operator2 === "*" || operator2 === "/" ? 1 : 0;
  return operator1Priority - operator2Priority;
};

/**
 *
 * @param {*} infixExpression
 */
function infixToSuffixExpression(infixExpression) {
  const operand = [];
  const operator = [];
  for (let index = 0; index < infixExpression.length; index++) {
    const element = infixExpression[index];
    if (operandRegExp.test(element)) {
      operand.push(element);
    } else if (operatorRegExp.test(element)) {
      let currentOperator = element;
      while (currentOperator) {
        if (operator.length === 0) {
          operator.push(currentOperator);
          currentOperator = null;
        } else {
          const lastOperator = operator[operator.length - 1];
          if (compareOperatorPriority(currentOperator, lastOperator) > 0) {
            operator.push(currentOperator);
            currentOperator = null;
          } else {
            operand.push(operator.pop());
          }
        }
      }
    }
  }
  if (operator.length > 0) {
    while (operator.length > 0) {
      operand.push(operator.pop());
    }
  }
  return operand;
}

function infixToPrefixExpression(infixExpression) {}

console.log(infixToSuffixExpression(["3", "+", "4", "+", "5"]));

console.log(infixToSuffixExpression(["3", "+", "4", "*", "5"]));

console.log(
  infixToSuffixExpression(["3", "+", "4", "*", "5", "/", "6", "-", "7"])
);
