import { AppError } from '@naturalcycles/js-lib/error'
import type * as SentryLib from '@sentry/node-core/light'
import { expect, it, vi } from 'vitest'
import { SentrySharedService } from './sentry.shared.service.js'

it('should report an error to sentry, with the inspected error as a breadcrumb', () => {
  const sentry = createSentryMock()
  const service = new SentrySharedService({ sentry })

  const eventId = service.captureException(new AppError('kaboom', { code: 'BOOM' }))

  expect(eventId).toBe('eventId1')
  expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
    message: expect.stringContaining('kaboom'),
  })
  expect(sentry.captureException).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'kaboom', data: { code: 'BOOM' } }),
  )
})

it('should not report an error whose data has report: false', () => {
  const sentry = createSentryMock()
  const service = new SentrySharedService({ sentry })

  const eventId = service.captureException(new AppError('kaboom', { report: false }))

  expect(eventId).toBeUndefined()
  expect(sentry.captureException).not.toHaveBeenCalled()
})

function createSentryMock(): typeof SentryLib {
  return {
    addBreadcrumb: vi.fn<typeof SentryLib.addBreadcrumb>(),
    captureException: vi.fn<typeof SentryLib.captureException>(() => 'eventId1'),
  } as unknown as typeof SentryLib
}
