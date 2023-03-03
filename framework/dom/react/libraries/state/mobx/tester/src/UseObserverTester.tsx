import { computed, reaction } from 'mobx';
import { useLocalObservable, useObserver } from 'mobx-react';
import { useEffect } from 'react';

export default () => {
  const state = useLocalObservable(
    () => ({
      user: {
        age: 0,
      },
      increase() {
        this.user.age += 1;
      },
      get xxx() {
        console.log('>>xxxxxxxxxxx');
        return 1;
      },
    }),
    {
      xxx: computed({
        keepAlive: true,
      }),
    }
  );
  // useEffect(() => {
  //   reaction(
  //     () => state.xxx,
  //     () => {
  //       console.log('123');
  //     }
  //   );
  // }, []);
  console.log('>> tester111', Date.now(), state);
  return (
    <div>
      {useObserver(() => {
        console.log('>> tester useLocalObservable', Date.now(), state.user);
        return <button onClick={() => state.increase()}>{state.user.age}</button>;
      })}
    </div>
  );
};
