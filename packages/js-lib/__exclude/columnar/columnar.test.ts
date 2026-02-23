import { expect, test } from 'vitest'
import { _range } from '../array/index.js'
import { ColumnarParser } from './columnar.js'

interface Item {
  s1: string
  s2?: string
  n1: number
  n2?: number
  n3?: number
  n4?: number
  n5?: number
  b1: boolean
  b2?: boolean
  // todo: arrays of objects?
  // todo: sub-objects
}

const mockItems: Item[] = _range(1, 4).map(i => {
  const even = i % 2 === 0
  const odd = !even
  return {
    s1: `s1_${i}`,
    s2: odd ? `s2_${i}` : undefined,
    n1: i,
    n2: odd ? i * 2 : undefined,
    n3: even ? i * 3 : undefined,
    n4: odd ? i * 4 : undefined,
    n5: even ? i * 5 : undefined,
    b1: even,
    b2: even || undefined,
  }
})

const parser = new ColumnarParser<Item>({
  columns: [
    's1', 's2', 'n1','n2','n3','n4','n5','b1','b2',
  ],
})

test('basic A', () => {
  const serializedRows = parser.serializeA(mockItems)
  const json1 = JSON.stringify(serializedRows[0])
  const json2 = JSON.stringify(serializedRows[1])
  const json3 = JSON.stringify(serializedRows[2])
  expect(json1).toMatchInlineSnapshot(`"["s1_1","s2_1",1,2,null,4,null,false]"`)
  expect(json2).toMatchInlineSnapshot(`"["s1_2",null,2,null,6,null,10,true,true]"`)
  expect(json3).toMatchInlineSnapshot(`"["s1_3","s2_3",3,6,null,12,null,false]"`)

  const deserializedRows = parser.deserializeA(serializedRows)
  expect(deserializedRows).toStrictEqual(mockItems)
})

test('basic B', () => {
  const serializedRows = parser.serializeB(mockItems)
  const json1 = JSON.stringify(serializedRows[0])
  const json2 = JSON.stringify(serializedRows[1])
  const json3 = JSON.stringify(serializedRows[2])
  expect(json1).toMatchInlineSnapshot(`"[[0,"s1_1"],[1,"s2_1"],[2,1],[3,2],[5,4],[7,false]]"`)
  expect(json2).toMatchInlineSnapshot(`"[[0,"s1_2"],[2,2],[4,6],[6,10],[7,true],[8,true]]"`)
  expect(json3).toMatchInlineSnapshot(`"[[0,"s1_3"],[1,"s2_3"],[2,3],[3,6],[5,12],[7,false]]"`)

  const deserializedRows = parser.deserializeB(serializedRows)
  expect(deserializedRows).toStrictEqual(mockItems)
})
