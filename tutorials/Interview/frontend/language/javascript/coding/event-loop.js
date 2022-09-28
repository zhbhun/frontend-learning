function process() {
  setTimeout(() => {
    console.log('A')
    Promise.resolve().then(() => {
      console.log('B')
    })
  });
  const promsie = new Promise((resolve) => {
    console.log('C')
    resolve()
    setTimeout(() => {
      console.log('D')
    })
  }).then(() => {
    return new Promise((resolve) => {
      console.log('E')
      resolve()
    })
  })
  setTimeout(() => {
    console.log('F')
  });
  return promsie
}

process().then(() => {
  console.log('G')
})

console.log('H')

throw new Error('unkown')

console.log('I')

// C H E G A B D F
