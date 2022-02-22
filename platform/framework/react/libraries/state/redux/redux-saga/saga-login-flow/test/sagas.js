import test from 'ava'
import {take, put, call, race} from 'redux-saga/effects'
import * as constants from '../app/actions/constants'
import * as actions from '../app/actions'
import {logoutFlow, registerFlow, loginFlow, authorize, logout} from '../app/sagas'

const user = {username: 'juan', password: 'password'}
const data = {data: user}
const blankForm = {username: '', password: ''}
const raceObject = {
  auth: call(authorize, {...user, isRegistering: false}),
  logout: take(constants.LOGOUT)
}

test('loginFlow saga with success', t => {
  const gen = loginFlow()
  const loginRace = race(raceObject)
  const authWinner = {auth: true}

  t.deepEqual(
    gen.next().value,
    take(constants.LOGIN_REQUEST)
  )

  t.deepEqual(
    gen.next(data).value,
    loginRace
  )

  t.deepEqual(
    gen.next(authWinner).value,
    put(actions.setAuthState(true))
  )

  t.deepEqual(
    gen.next().value,
    put(actions.changeForm(blankForm))
  )
})

test('logoutFlow saga', t => {
  const gen = logoutFlow()

  t.deepEqual(
    gen.next().value,
    take(constants.LOGOUT)
  )

  t.deepEqual(
    gen.next().value,
    put(actions.setAuthState(false))
  )

  t.deepEqual(
    gen.next().value,
    call(logout)
  )
})

test('registerFlow saga with success', t => {
  const gen = registerFlow()

  t.deepEqual(
    gen.next().value,
    take(constants.REGISTER_REQUEST)
  )

  t.deepEqual(
    gen.next(data).value,
    call(authorize, {...user, isRegistering: true})
  )

  t.deepEqual(
    gen.next(true).value,
    put(actions.setAuthState(true))
  )

  t.deepEqual(
    gen.next(true).value,
    put(actions.changeForm(blankForm))
  )
})
