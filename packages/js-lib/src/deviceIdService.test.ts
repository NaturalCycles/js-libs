import { beforeEach, describe, expect, test, vi } from 'vitest'
import { _range } from './array/range.js'
import { DeviceIdService } from './deviceIdService.js'
import { InMemoryWebStorage } from './web.js'

describe('when run in Node', () => {
  test('deviceId should be null', () => {
    const deviceIdService = new DeviceIdService()
    expect(deviceIdService.deviceId).toBeNull()
    expect(deviceIdService.select(0.9)).toBe(false)
  })
})

describe('when run in Browser', () => {
  let localStorage: InMemoryWebStorage

  beforeEach(() => {
    localStorage = new InMemoryWebStorage()

    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('window', {
      document: {}, // so isServerSide() returns false
    })
  })

  test('deviceId should be generated, and then persisted', () => {
    const deviceIdService = new DeviceIdService()
    expect(deviceIdService.deviceId).not.toBeNull()
    expect(deviceIdService.deviceId?.length).toBe(21)
    expect(localStorage.getItem(deviceIdService.cfg.localStorageKey)).toBe(deviceIdService.deviceId)

    const service2 = new DeviceIdService()
    expect(service2.deviceId).toBe(deviceIdService.deviceId)

    deviceIdService.clearPersistence()
    expect(localStorage.getItem(deviceIdService.cfg.localStorageKey)).toBeNull()
  })

  test('selection rate should be close to the target', () => {
    const devices = 100_000
    const rate = 0.25
    let selected = 0
    _range(devices).forEach(() => {
      const service = new DeviceIdService()
      if (service.select(rate)) selected++
      service.clearPersistence() // so the next device will generate the id again
    })
    const selectedRate = selected / devices
    console.log({ selected, selectedRate, targetRate: rate })

    // Test that the target rate is between 20% and 30%, with the target of 25%
    expect(selectedRate).toBeGreaterThan(0.2)
    expect(selectedRate).toBeLessThan(0.3)
  })
})
