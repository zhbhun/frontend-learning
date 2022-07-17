import produce from 'immer';

interface User {
  first: string;
  last: string;
  others: {
    sex: number;
  };
}

const user: User = {
  first: 'a',
  last: 'b',
  others: {
    sex: 1,
  },
};

const user1 = produce(user, (draftState) => {
  draftState.first = 'a1';
});

console.log(user1);
console.log(user1 === user);
console.log(user1.others === user.others);
