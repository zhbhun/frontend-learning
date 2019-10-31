document.documentElement.addEventListener('click', function (event) {
  Sentry.captureEvent(event);
});
