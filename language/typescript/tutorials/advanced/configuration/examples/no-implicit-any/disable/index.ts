const implicitUndefinedCons = undefined;
const explicitUndefinedCons: any = undefined;

const implicitNullCons = null;
const explicitNullCons: any = null;

function fnWithImplicitAny(s) {
  // Parameter 's' implicitly has an 'any' type, but a better type may be inferred from usage.
  console.log(s.subtr(3));
}

function fnWithExplicitAny(s: any) {
  console.log(s.sustr(3));
}
