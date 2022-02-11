const obj = {
  get notifier() {
    console.log("access");
    delete this.notifier;
    return (this.notifier = Math.random());
  },
};

console.log('1', obj.notifier);
console.log('2', obj.notifier);
