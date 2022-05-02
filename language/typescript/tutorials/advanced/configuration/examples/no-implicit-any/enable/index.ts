const implicitUndefinedCons = undefined; // Variable 'undefinedCons' implicitly has an 'any' type.
const explicitUndefinedCons: any = undefined;

const implicitNullCons = null; // Variable 'nullCons' implicitly has an 'any' type.
const explicitNullCons: any = null;

function fnWithImplicitAny(s) {
  // Parameter 's' implicitly has an 'any' type.
  console.log(s.subtr(3));
}

function fnWithExplicitAny(s: any) {
  console.log(s.sustr(3));
}
