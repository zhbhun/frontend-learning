const evens = [];

/* More expressive closure syntax. */
const odds = evens.map(v => v + 1);
const pairs = evens.map(v => ({ even: v, odd: v + 1 }));
const nums = evens.map((v, i) => v + i);

/* More expressive closure syntax. */
nums.forEach(v => {
  if (v % 5 === 0) fives.push(v);
});

/* More intuitive handling of current object context. */
this.nums = nums;
this.fives = [];
this.nums.forEach(v => {
  if (v % 5 === 0) this.fives.push(v);
});
