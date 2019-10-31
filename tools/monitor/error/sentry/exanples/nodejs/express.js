const express = require('express')
const Sentry = require('@sentry/node')

Sentry.init({
  dsn: 'https://099a0d86bc054373a8d67d53d1e9dc4c@sentry.io/1800539',
  beforeSend: (event, hint) => {
    console.log('--> beforeSend');
    console.log(event);
    return event;
  },
  integrations: function(integrations) {
    // integrations will be all default integrations
    return integrations.filter(function(integration) {
      return integration.name !== 'Console';
    });
  }
});

const app = express()

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/error', (req, res) => {
  throw new Error('test')
})

app.get('/async', (req, res) => {
  setTimeout(() => {
    throw new Error('test')
  }, 0);
})

app.get('/promise', (req, res, next) => {
  Promise.reject(new Error('test'));
  res.send('success');
})

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler())

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500
  res.end(res.sentry + "\n")
})

const port = 3000

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
