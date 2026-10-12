import { expect, test } from 'vitest'
import { InMemoryPersistencePlugin } from './inMemory.persistence.plugin.js'

test('clear removes all tables', async () => {
  const plugin = new InMemoryPersistencePlugin()
  await plugin.saveFiles([{ type: 'saveBatch', table: 'table1', rows: [{ id: 'id1' }] }])

  plugin.clear()

  expect(plugin.data).toEqual({})
  expect(await plugin.getTables()).toEqual([])
})
