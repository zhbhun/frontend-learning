import React from 'react';
import { Router, Route, browserHistory } from 'react-router'
import App from './App'
import SimpleFormExample from './SimpleFormExample'
import SyncValidationExample from './SyncValidationExample'
import FieldLevelValidationExample from './FieldLevelValidationExample'
import SubmitValidationExample from './SubmitValidationExample'
import AsyncValidationExample from './AsyncValidationExample'

export default function Root() {
  return (
    <Router history={browserHistory}>
      <Route path="/" component={App}>
        <Route path="simple-form" component={SimpleFormExample} />
        <Route path="sync-validation" component={SyncValidationExample} />
        <Route path="field-level-validation" component={FieldLevelValidationExample} />
        <Route path="submit-validation" component={SubmitValidationExample} />
        <Route path="async-validation" component={AsyncValidationExample} />
      </Route>
    </Router>
  );
}
