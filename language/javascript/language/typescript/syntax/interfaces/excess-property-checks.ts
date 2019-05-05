(function () {
  interface SquareConfig {
    color?: string;
    width?: number;
  }

  function createSquare(config: SquareConfig) {
    // ...
  }

  let squareConfig = { colour: 'red', width: 100 };
  let mySquare = createSquare(squareConfig);
})();

// assigning object literals to other variables
(function () {
  interface SquareConfig {
    color?: string;
    width?: number;
  }

  let squareConfig: SquareConfig = { colour: 'red', width: 100 };
})();

// passing object literals as arguments
(function () {
  interface SquareConfig {
    color?: string;
    width?: number;
  }

  function createSquare(config: SquareConfig) {
    // ...
  }

  let mySquare = createSquare({ colour: "red", width: 100 });
})();

// type assertion
(function () {
  interface SquareConfig {
    color?: string;
    width?: number;
  }

  function createSquare(config: SquareConfig) {
    // ...
  }

  let mySquare = createSquare({ width: 100, opacity: 0.5 } as SquareConfig);
})();

// add a string index signature
(function () {
  interface SquareConfig {
    color?: string;
    width?: number;
    [propName: string]: any;
  }

  function createSquare(config: SquareConfig) {
    // ...
  }

  let mySquare = createSquare({ colour: "red", width: 100 });
})
