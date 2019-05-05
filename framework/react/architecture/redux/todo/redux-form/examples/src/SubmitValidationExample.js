import React from 'react'
import { Field, reduxForm, SubmissionError } from 'redux-form'

const renderField = ({ input, label, type, meta: { touched, error } }) => (
  <div>
    <label>{label}</label>
    <div>
      <input {...input} placeholder={label} type={type}/>
      {touched && error && <span>{error}</span>}
    </div>
  </div>
)

const SubmitValidationForm = (props) => {
  const { error, handleSubmit, pristine, reset, submitting } = props
  return (
    <form onSubmit={handleSubmit(submit)}>
      <Field name="username" type="text" component={renderField} label="Username"/>
      <Field name="password" type="password" component={renderField} label="Password"/>
      {error && <strong>{error}</strong>}
      <div>
        <button type="submit" disabled={submitting}>Log In</button>
        <button type="button" disabled={pristine || submitting} onClick={reset}>Clear Values</button>
      </div>
    </form>
  )
}

const ConnectedSubmitValidationForm = reduxForm({
  form: 'submitValidation'  // a unique identifier for this form
})(SubmitValidationForm)

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function submit(values) {
  return sleep(1000) // simulate server latency
    .then(() => {
      if (![ 'john', 'paul', 'george', 'ringo' ].includes(values.username)) {
        throw new SubmissionError({ username: 'User does not exist', _error: 'Login failed!' })
      } else if (values.password !== 'redux-form') {
        throw new SubmissionError({ password: 'Wrong password', _error: 'Login failed!' })
      } else {
        window.alert(`You submitted:\n\n${JSON.stringify(values, null, 2)}`)
      }
    })
}

export default function SubmitValidationExample() {
  return (
    <ConnectedSubmitValidationForm onSubmit={submit} />
  )
}

