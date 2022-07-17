import { fromJS } from 'immutable';

interface User {
  first: string;
  last: string;
  others: {
    sex: number;
  };
}

const user: User = {} as any;

const map1 = fromJS(user);

