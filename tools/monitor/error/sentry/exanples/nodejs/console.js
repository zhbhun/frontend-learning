const Sentry = require('@sentry/node');

Sentry.init({
  dsn: 'https://099a0d86bc054373a8d67d53d1e9dc4c@sentry.io/1800539'
});

try {
  console.log('log');
  console.error('error');
  myUndefinedFunction();
} catch (error) {
  Sentry.captureException(error);
}
