function* helloWorldGenerator() {
  yield 'hello';
  yield 'world';
  return 'ending';
}

module.exports = helloWorldGenerator;
