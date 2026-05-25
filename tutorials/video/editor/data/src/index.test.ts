import { describe, expect, it } from 'vitest'

import { greet, VERSION } from './index'

describe('greet', () => {
  it('should return greeting message', () => {
    expect(greet('World')).toBe('Hello, World!')
  })
})

describe('VERSION', () => {
  it('should be defined', () => {
    expect(VERSION).toBe('0.0.1')
  })
})