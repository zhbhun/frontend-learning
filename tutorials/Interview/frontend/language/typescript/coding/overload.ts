class Customer {

  // value1, value2 类型一致，且要是 number 或 string
  add(value1: any, value2: any): number {
    if (typeof value1 == "number" && typeof value2 === "number") {
      return value1 + value2
    }
    if (typeof value1 == "string" && typeof value2 === "string") {
      return Number(value1 + value2)
    }
    throw new Error('unsupport')
  }
}

const customer = new Customer();

console.log(customer.add(1, 1)); // 2

console.log(customer.add('1', '1')); // 11

console.log(customer.add(1, '1')); //
