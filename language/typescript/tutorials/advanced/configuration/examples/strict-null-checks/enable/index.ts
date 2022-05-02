let numberValWithUndefined: number = undefined; // Type 'undefined' is not assignable to type 'number'.
let numberValWithNull: number = null; // Type 'null' is not assignable to type 'number'.

// ---

const temp: number[] | undefined = [] as any;
console.log(temp.length); // Object is possibly 'undefined'.

// ---

function funWithUndefined(): number[] | undefined {
  return undefined;
}
const resultOfFunWithUndefiend = funWithUndefined();
console.log(resultOfFunWithUndefiend.length); // Object is possibly 'undefined'.
console.log(resultOfFunWithUndefiend?.length);

// ---

declare const loggedInUsername: string;

const users = [
  { name: "Oby", age: 12 },
  { name: "Heera", age: 32 },
];

const loggedInUser = users.find((u) => u.name === loggedInUsername);
console.log(loggedInUser.age); // Object is possibly 'undefined'.
