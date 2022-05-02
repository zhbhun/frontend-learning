function printId1(id: number | string) {
  console.log("Your ID is: " + id.toString());
}

function printId2(id: number | string) {
  console.log(id.toUpperCase());
  // Property 'toUpperCase' does not exist on type 'string | number'
  // Property 'toUpperCase' does not exist on type 'number'.

  if (typeof id === "string") {
    // In this branch, id is of type 'string'
    console.log(id.toUpperCase());
  } else {
    // Here, id is of type 'number'
    console.log(id);
  }
}
