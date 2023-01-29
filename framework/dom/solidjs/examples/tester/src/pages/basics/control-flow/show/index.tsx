import { createSignal, Show } from 'solid-js';

function IFTester() {
  const [loggedIn, setLoggedIn] = createSignal(false);
  const toggle = () => setLoggedIn(!loggedIn());

  const renderButton = () => {
    console.log('>> render');
    if (loggedIn()) {
      return <button onClick={toggle}>Log out</button>;
    }
    return <button onClick={toggle}>Log in</button>;
  };

  return (
    <section>
      <h2>IF</h2>
      {renderButton()}
    </section>
  );
}

function TernariesTester() {
  const [loggedIn, setLoggedIn] = createSignal(false);
  const toggle = () => setLoggedIn(!loggedIn());

  return (
    <section>
      <h2>Ternaries</h2>
      {loggedIn() ? (
        <button onClick={toggle}>Log out</button>
      ) : (
        <button onClick={toggle}>Log in</button>
      )}
    </section>
  );
}

function ShowTester() {
  const [loggedIn, setLoggedIn] = createSignal(false);
  const toggle = () => setLoggedIn(!loggedIn());

  return (
    <section>
      <h2>Show</h2>
      <Show
        when={loggedIn()}
        fallback={<button onClick={toggle}>Log in</button>}
      >
        <button onClick={toggle}>Log out</button>
      </Show>
    </section>
  );
}

export default () => {
  return (
    <>
      <IFTester />
      <TernariesTester />
      <ShowTester />
    </>
  );
};
