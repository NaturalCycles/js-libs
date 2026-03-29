import { expect, test } from 'vitest'
import { testDir } from '../paths.cnst.js'
import type { BackendCfg } from './backend.cfg.util.js'
import { backendCfgSchema, getBackendCfg } from './backend.cfg.util.js'

const validMinimal: BackendCfg = {
  gaeProject: 'my-project',
  gaeService: 'default',
  appEnvDefault: 'prod',
}

const validFull: BackendCfg = {
  gaeProject: 'my-project',
  gaeProjectByBranch: { main: 'my-project-prod', staging: 'my-project-staging' },
  gaeService: 'default',
  gaeServiceByBranch: { main: 'api', staging: 'api-staging' },
  files: ['dist', 'package.json'],
  appEnvDefault: 'prod',
  appEnvByBranch: { main: 'prod', staging: 'staging' },
  branchesWithTimestampVersions: ['main'],
  hashedBranches: true,
  appYamlPassEnv: 'SECRET_KEY,API_TOKEN',
}

test('validates minimal valid BackendCfg', () => {
  expect(backendCfgSchema.validate(validMinimal)).toEqual(validMinimal)
})

test('validates full valid BackendCfg', () => {
  expect(backendCfgSchema.validate(validFull)).toEqual(validFull)
})

test('rejects missing gaeProject', () => {
  const { gaeProject: _, ...invalid } = validMinimal
  expect(() => backendCfgSchema.validate(invalid)).toThrow('gaeProject')
})

test('rejects missing gaeService', () => {
  const { gaeService: _, ...invalid } = validMinimal
  expect(() => backendCfgSchema.validate(invalid)).toThrow('gaeService')
})

test('rejects missing appEnvDefault', () => {
  const { appEnvDefault: _, ...invalid } = validMinimal
  expect(() => backendCfgSchema.validate(invalid)).toThrow('appEnvDefault')
})

test('rejects wrong type for gaeProject', () => {
  expect(() => backendCfgSchema.validate({ ...validMinimal, gaeProject: 123 } as any)).toThrow(
    'must be string',
  )
})

test('rejects wrong type for hashedBranches', () => {
  expect(() =>
    backendCfgSchema.validate({ ...validMinimal, hashedBranches: 'true' } as any),
  ).toThrow('must be boolean')
})

test('rejects wrong type for files', () => {
  expect(() =>
    backendCfgSchema.validate({ ...validMinimal, files: 'not-an-array' } as any),
  ).toThrow('must be array')
})

test('strips additional properties', () => {
  const result = backendCfgSchema.validate({ ...validMinimal, unknownProp: 'value' } as any)
  expect(result).toEqual(validMinimal)
  expect(result).not.toHaveProperty('unknownProp')
})

test('getBackendCfg with test fixture', () => {
  const cfg = getBackendCfg(`${testDir}/project`)
  expect(cfg).toEqual({
    gaeProject: 'test-project',
    gaeService: 'test-service',
    appEnvDefault: 'prod',
    appYamlPassEnv: 'AA,BB',
    hashedBranches: true,
  })
})
