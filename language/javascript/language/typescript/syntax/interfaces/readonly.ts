// readonly property
(function () {
  interface Point {
    readonly x: number;
    readonly y: number;
  }
  let p1: Point = { x: 10, y: 20 };
  p1.x = 5; // Error, Cannot assign to 'x' because it is a constant or a read-only property.
})();

// readonly array
(function () {
  let a: number[] = [1, 2, 3, 4];
  let ro: ReadonlyArray<number> = a;
  ro[0] = 12; // Error, Index signature in type 'ReadonlyArray< number > ' only permits
  ro.push(5); // Error, Property 'push' does not exist on type 'ReadonlyArray< number > '.'
  ro.length = 100; // Error, Cannot assign to 'length' because it is a constant or a read-only property.
  a = ro; // Error, Type 'ReadonlyArray< number > ' is not assignable to type 'number[]'.
  a = ro as number[]; // a = ro as Array<number>;
})
