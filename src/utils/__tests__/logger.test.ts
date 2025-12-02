/**
 * Logger Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  configureLogger,
  getLoggerConfig,
  debug,
  info,
  warn,
  error,
  logger
} from '../logger'

describe('Logger', () => {
  // Save original console methods
  const originalDebug = console.debug
  const originalInfo = console.info
  const originalWarn = console.warn
  const originalError = console.error

  beforeEach(() => {
    // Reset logger to default
    configureLogger({ level: 'warn', prefix: '[CBOR]' })
    // Mock console methods
    console.debug = vi.fn()
    console.info = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    // Restore console methods
    console.debug = originalDebug
    console.info = originalInfo
    console.warn = originalWarn
    console.error = originalError
  })

  describe('configureLogger', () => {
    it('should update logger configuration', () => {
      configureLogger({ level: 'debug' })
      expect(getLoggerConfig().level).toBe('debug')
    })

    it('should update prefix', () => {
      configureLogger({ prefix: '[TEST]' })
      expect(getLoggerConfig().prefix).toBe('[TEST]')
    })

    it('should merge with existing config', () => {
      configureLogger({ level: 'error' })
      configureLogger({ prefix: '[NEW]' })
      const config = getLoggerConfig()
      expect(config.level).toBe('error')
      expect(config.prefix).toBe('[NEW]')
    })
  })

  describe('getLoggerConfig', () => {
    it('should return current configuration', () => {
      const config = getLoggerConfig()
      expect(config).toHaveProperty('level')
      expect(config).toHaveProperty('prefix')
    })

    it('should return a copy (not reference)', () => {
      const config1 = getLoggerConfig()
      const config2 = getLoggerConfig()
      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('debug', () => {
    it('should log when level is debug', () => {
      configureLogger({ level: 'debug' })
      debug('test message')
      expect(console.debug).toHaveBeenCalledWith('[CBOR] test message')
    })

    it('should not log when level is higher than debug', () => {
      configureLogger({ level: 'info' })
      debug('test message')
      expect(console.debug).not.toHaveBeenCalled()
    })

    it('should pass additional arguments', () => {
      configureLogger({ level: 'debug' })
      debug('test', { foo: 'bar' }, 123)
      expect(console.debug).toHaveBeenCalledWith('[CBOR] test', { foo: 'bar' }, 123)
    })
  })

  describe('info', () => {
    it('should log when level is info or lower', () => {
      configureLogger({ level: 'info' })
      info('test message')
      expect(console.info).toHaveBeenCalledWith('[CBOR] test message')
    })

    it('should not log when level is higher than info', () => {
      configureLogger({ level: 'warn' })
      info('test message')
      expect(console.info).not.toHaveBeenCalled()
    })

    it('should pass additional arguments', () => {
      configureLogger({ level: 'info' })
      info('test', { foo: 'bar' })
      expect(console.info).toHaveBeenCalledWith('[CBOR] test', { foo: 'bar' })
    })
  })

  describe('warn', () => {
    it('should log when level is warn or lower', () => {
      configureLogger({ level: 'warn' })
      warn('test message')
      expect(console.warn).toHaveBeenCalledWith('[CBOR] test message')
    })

    it('should not log when level is error', () => {
      configureLogger({ level: 'error' })
      warn('test message')
      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should pass additional arguments', () => {
      configureLogger({ level: 'warn' })
      warn('test', 123)
      expect(console.warn).toHaveBeenCalledWith('[CBOR] test', 123)
    })
  })

  describe('error', () => {
    it('should log when level is error or lower', () => {
      configureLogger({ level: 'error' })
      error('test message')
      expect(console.error).toHaveBeenCalledWith('[CBOR] test message')
    })

    it('should not log when level is silent', () => {
      configureLogger({ level: 'silent' })
      error('test message')
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should pass additional arguments', () => {
      configureLogger({ level: 'error' })
      error('test', new Error('oops'))
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('formatMessage without prefix', () => {
    it('should format message without prefix when prefix is empty', () => {
      configureLogger({ level: 'debug', prefix: '' })
      debug('test message')
      expect(console.debug).toHaveBeenCalledWith('test message')
    })

    it('should format message without prefix when prefix is undefined', () => {
      configureLogger({ level: 'debug', prefix: undefined })
      debug('test message')
      expect(console.debug).toHaveBeenCalledWith('test message')
    })
  })

  describe('logger object', () => {
    it('should expose all methods', () => {
      expect(logger.debug).toBe(debug)
      expect(logger.info).toBe(info)
      expect(logger.warn).toBe(warn)
      expect(logger.error).toBe(error)
      expect(logger.configure).toBe(configureLogger)
      expect(logger.getConfig).toBe(getLoggerConfig)
    })

    it('should work via logger object', () => {
      logger.configure({ level: 'debug' })
      logger.debug('via object')
      expect(console.debug).toHaveBeenCalled()
    })
  })
})
