// literals
(function () {
  function printLabel(labelledObj: { label: string }) {
    console.log(labelledObj.label);
  }

  let myObj = { size: 10, label: "Size 10 Object" };
  printLabel(myObj);
})();

// interface
(function () {
  interface LabelledValue {
    label: string;
  }

  function printLabel(labelledObj: LabelledValue) {
    console.log(labelledObj.label);
  }

  let myObj = { size: 10, label: "Size 10 Object" };
  printLabel(myObj);
})();
