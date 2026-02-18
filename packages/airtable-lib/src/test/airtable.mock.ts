import { _range } from '@naturalcycles/js-lib/array/range.js'
import { _filterFalsyValues } from '@naturalcycles/js-lib/object/object.util.js'
import { j } from '@naturalcycles/nodejs-lib/ajv'
import type { AirtableAttachment, AirtableRecord } from '../airtable.model.js'
import {
  airtableAttachmentsSchema,
  airtableMultipleLinkSchema,
  airtableSingleLinkSchema,
} from '../airtable.model.js'
import { AirtableBaseDao } from '../airtableBaseDao.js'
import { AirtableBasesDao } from '../airtableBasesDao.js'
import type { AirtableLib } from '../airtableLib.js'
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

export const userSchema = j.object<User>({
  airtableId: j.string(),
  id: j.string(),
  email: j.string().email(),
  roles: airtableMultipleLinkSchema<Role>(),
  category: airtableSingleLinkSchema<Category>(),
  tags: j.array(j.string()).default([]),
  images: airtableAttachmentsSchema,
})

export interface Permission extends AirtableRecord {
  id: string
  pub?: boolean
  descr?: string
  parent: Permission[]
  roles: Role[]
}

export const permissionSchema = j.object<Permission>({
  airtableId: j.string(),
  id: j.string(),
  pub: j.boolean().optional(),
  descr: j.string().optional(),
  parent: airtableSingleLinkSchema<Permission>(),
  roles: airtableMultipleLinkSchema<Role>(),
})

export interface Role extends AirtableRecord {
  id: string
  pub?: boolean
  descr?: string
  permissions: Permission[]
  users: User[]
}

export const roleSchema = j.object<Role>({
  airtableId: j.string(),
  id: j.string(),
  pub: j.boolean().optional(),
  descr: j.string().optional(),
  permissions: airtableMultipleLinkSchema<Permission>(),
  users: airtableMultipleLinkSchema<User>(),
})

export interface Category extends AirtableRecord {
  id: string
  users: User[]
}

export const categorySchema = j.object<Category>({
  airtableId: j.string(),
  id: j.string(),
  users: airtableMultipleLinkSchema<User>(),
})

export function mockTableDao1(airtableLib: AirtableLib, baseId: string): AirtableTableDao<Table1> {
  return new AirtableTableDao<Table1>(airtableLib, baseId, 'table1', {
    idField: 'name',
    sort: [{ field: 'name' }],
  })
}

export function mockTableDao2(airtableLib: AirtableLib, baseId: string): AirtableTableDao<Table2> {
  return new AirtableTableDao<Table2>(airtableLib, baseId, 'table2', {
    idField: 'name',
    sort: [{ field: 'name' }],
  })
}

export function mockBaseDao(airtableLib: AirtableLib, baseId: string): AirtableBaseDao<TestBase> {
  const baseName = 'Test'

  return new AirtableBaseDao<TestBase>({
    baseId,
    baseName,
    primaryConnector: AIRTABLE_CONNECTOR_JSON,
    connectors: [
      new AirtableJsonConnector<TestBase>({ cacheDir }),
      new AirtableRemoteConnector<TestBase>(airtableLib),
    ],
    tableCfgMap: {
      users: { validationFn: userSchema.getValidationFunction(), idField: 'id' },
      roles: { validationFn: roleSchema.getValidationFunction(), idField: 'id' },
      permissions: {
        validationFn: permissionSchema.getValidationFunction(),
        idField: 'id',
      },
      categories: {
        validationFn: categorySchema.getValidationFunction(),
        idField: 'id',
      },
    },
    noAttachmentQueryString: true,
  })
}

export function mockBasesDao(airtableLib: AirtableLib, baseId: string): AirtableBasesDao<BaseMap> {
  const baseDao = mockBaseDao(airtableLib, baseId)
  return new AirtableBasesDao<BaseMap>([baseDao])
}
