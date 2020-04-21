if (process.env.NODE_ENV === 'development') {
  if (process.env.REACT_APP_PREACT === 'true') {
    require('preact/debug');
    require('preact/devtools');
  }
}

