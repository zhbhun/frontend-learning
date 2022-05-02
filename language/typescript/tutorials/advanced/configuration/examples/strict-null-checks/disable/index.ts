let numberValWithUndefined: number = undefined
let numberValWithNull: number = null

// ---

const temp: number[] | undefined = [] as any;
console.log(temp.length);

// ---

function funWithUndefined(): number[] | undefined {
  return undefined;
}
const resultOfFunWithUndefiend = funWithUndefined();
console.log(resultOfFunWithUndefiend.length);
console.log(resultOfFunWithUndefiend?.length);

// ---
