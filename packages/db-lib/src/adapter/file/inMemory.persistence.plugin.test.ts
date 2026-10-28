import { expect, it } from 'vitest'
import { InMemoryPersistencePlugin } from './inMemory.persistence.plugin.js'

it('should remove all tables on clear', async () => {
  const plugin = new InMemoryPersistencePlugin()
  await plugin.saveFiles([{ type: 'saveBatch', table: 'table1', rows: [{ id: 'id1' }] }])

  plugin.clear()

  expect(plugin.data).toEqual({})
  expect(await plugin.getTables()).toEqual([])
})
