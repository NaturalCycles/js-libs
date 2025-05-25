import { _filterFalsyValues, _range } from '@naturalcycles/js-lib'
import {
  arraySchema,
  booleanSchema,
  emailSchema,
  objectSchema,
  stringSchema,
} from '@naturalcycles/nodejs-lib'
import type { AirtableApi } from '../airtable.api.js'
import type { AirtableAttachment, AirtableRecord } from '../airtable.model.js'
import {
  airtableAttachmentsSchema,
  airtableMultipleLinkSchema,
  airtableRecordSchema,
  airtableSingleLinkSchema,
} from '../airtable.model.js'
import { AirtableBaseDao } from '../airtableBaseDao.js'
import { AirtableBasesDao } from '../airtableBasesDao.js'
import { AirtableTableDao } from '../airtableTableDao.js'
import {
  AIRTABLE_CONNECTOR_JSON,
  AirtableJsonConnector,
} from '../connector/airtableJsonConnector.js'
import { AirtableRemoteConnector } from '../connector/airtableRemoteConnector.js'
import { cacheDir } from '../paths.cnst.js'

export interface BaseMap {
  TestBase: TestBase
}

export interface TestBase {
  // table1: Table1[]
  // table2: Table2[]
  users: User[]
  roles: Role[]
  permissions: Permission[]
  categories: Category[]
}

export interface Table1 extends AirtableRecord {
  name: string
  field1?: string
  numField?: number
  linkTable2?: Table2[]
}

export interface Table2 extends AirtableRecord {
  name: string
  field3?: string
  boolField?: boolean
  // _linkTable1?: Table1[]
}

export function mockTable1(): Table1[] {
  return _range(1, 10).map(
    num =>
      ({
        name: `name_${num}`,
        field1: `val ${num}`,
        ...(num % 2 === 0 && { numField: num }),
      }) as Table1,
  )
}

export function mockTable2(): Table2[] {
  return _range(1, 10).map(num =>
    _filterFalsyValues({
      name: `name2_${num}`,
      field3: `val3 ${num}`,
      boolField: num % 2 === 0,
    } as Table2),
  )
}

export interface User extends AirtableRecord {
  id: string
  email: string
  roles: Role[]
  category: Category[] // 1-to-1 looks same as 1-to-many in Airtable. That's a limitation
  tags: string[]
  images: AirtableAttachment[]
}

export const userSchema = objectSchema<User>({
  id: stringSchema,
  email: emailSchema,
  roles: airtableMultipleLinkSchema<Role>() as any,
  category: airtableSingleLinkSchema<Category>() as any,
  tags: arraySchema(stringSchema).optional().default([]),
  images: airtableAttachmentsSchema,
}).concat(airtableRecordSchema as any)

export interface Permission extends AirtableRecord {
  id: string
  pub?: boolean
  descr?: string
  parent: Permission[]
  roles: Role[]
}

export const permissionSchema = objectSchema<Permission>({
  id: stringSchema,
  pub: booleanSchema.optional(),
  descr: stringSchema.optional(),
  parent: airtableSingleLinkSchema<Permission>() as any,
  roles: airtableMultipleLinkSchema<Role>() as any,
}).concat(airtableRecordSchema as any)

export interface Role extends AirtableRecord {
  id: string
  pub?: boolean
  descr?: string
  permissions: Permission[]
  users: User[]
}

export const roleSchema = objectSchema<Role>({
  id: stringSchema,
  pub: booleanSchema.optional(),
  descr: stringSchema.optional(),
  permissions: airtableMultipleLinkSchema<Permission>() as any,
  users: airtableMultipleLinkSchema<User>() as any,
}).concat(airtableRecordSchema as any)

export interface Category extends AirtableRecord {
  id: string
  users: User[]
}

export const categorySchema = objectSchema<Category>({
  id: stringSchema,
  users: airtableMultipleLinkSchema<User>() as any,
}).concat(airtableRecordSchema as any)

export function mockTableDao1(api: AirtableApi, baseId: string): AirtableTableDao<Table1> {
  return new AirtableTableDao<Table1>(api, baseId, 'table1', {
    idField: 'name',
    sort: [{ field: 'name' }],
  })
}

export function mockTableDao2(api: AirtableApi, baseId: string): AirtableTableDao<Table2> {
  return new AirtableTableDao<Table2>(api, baseId, 'table2', {
    idField: 'name',
    sort: [{ field: 'name' }],
  })
}

export function mockBaseDao(api: AirtableApi, baseId: string): AirtableBaseDao<TestBase> {
  const baseName = 'Test'

  return new AirtableBaseDao<TestBase>({
    baseId,
    baseName,
    primaryConnector: AIRTABLE_CONNECTOR_JSON,
    connectors: [
      new AirtableJsonConnector<TestBase>({ cacheDir }),
      new AirtableRemoteConnector<TestBase>(api),
    ],
    tableCfgMap: {
      users: { validationSchema: userSchema, idField: 'id' },
      roles: { validationSchema: roleSchema, idField: 'id' },
      permissions: { validationSchema: permissionSchema, idField: 'id' },
      categories: { validationSchema: categorySchema, idField: 'id' },
    },
    noAttachmentQueryString: true,
  })
}

export function mockBasesDao(api: AirtableApi, baseId: string): AirtableBasesDao<BaseMap> {
  const baseDao = mockBaseDao(api, baseId)
  return new AirtableBasesDao<BaseMap>([baseDao])
}
