document.documentElement.addEventListener('click', function () {
  const xhr = new XMLHttpRequest();
  xhr.onload = function () {
    console.debug('loaded');
    Sentry.addBreadcrumb({
      category: 'ui',
      level: 'info',
      message: 'New window size:' + window.innerWidth + 'x' + window.innerHeight
    });
    history.pushState(null, '', '/beforebreadcrumb/index.html')
    myUndefinedFunction();
  };
  xhr.open('get', 'http://www.mocky.io/v2/5db9070130000064005ee042');
  xhr.send();
});
