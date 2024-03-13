if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      console.log('++', registration);
      registration.addEventListener('updatefound', () => {
        // If updatefound is fired, it means that there's
        // a new service worker being installed.
        const installingWorker = registration.installing;
        console.log(
          'A new service worker is being installed:',
          installingWorker,
          installingWorker.state
        );
        installingWorker.addEventListener('statechange', (e) => {
          console.log('>> statechange', installingWorker, installingWorker.state);
        });

        // You can listen for changes to the installing service worker's
        // state via installingWorker.onstatechange
      });
    });
  });
}
