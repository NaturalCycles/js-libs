import { DBQuery } from '@naturalcycles/db-lib'
import { TEST_TABLE } from '@naturalcycles/db-lib/testing'
import { expect, it, vi } from 'vitest'
import { MysqlDB } from './mysql.db.js'

it('should write object and array values as JSON strings when patching by query', async () => {
  const db = new MysqlDB()
  vi.spyOn(db, 'runSQL').mockResolvedValue({ affectedRows: 1 })

  await db.patchByQuery(new DBQuery<any>(TEST_TABLE).filterEq('id', 'id1'), {
    nested: { foo: 1 },
    list: ['a', 'b'],
  })

  expect(db.runSQL).toHaveBeenCalledWith({
    sql: `UPDATE \`TEST_TABLE\` SET \`nested\` = '{\\"foo\\":1}', \`list\` = '[\\"a\\",\\"b\\"]' WHERE \`id\` = 'id1'`,
  })
})
