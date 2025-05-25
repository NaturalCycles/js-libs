import type {
  AnyObject,
  CommonLogger,
  JsonSchemaBoolean,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRootObject,
  JsonSchemaString,
} from '@naturalcycles/js-lib'
import * as mysql from 'mysql'

export interface MySQLTableStats {
  Field: string // created
  Type: string // int(11)
  Null: string // 'YES'
}

export interface MySQLSchemaOptions {
  /**
   * @default 'InnoDB'
   */
  engine?: string
}

/**
 * It currently skips nullability and declares everything as "DEFAULT NULL".
 */
export function jsonSchemaToMySQLDDL(
  table: string,
  schema: JsonSchemaObject<any>,
  opt: MySQLSchemaOptions = {},
): string {
  const { engine = 'InnoDB' } = opt

  const lines: string[] = [`CREATE TABLE ${mysql.escapeId(table)} (`]

  const innerLines = Object.entries(schema.properties).map(([k, s]) => {
    if (k === 'id') {
      return `id VARCHAR(255) NOT NULL`
    }

    let type: string

    if (s.type === 'string') {
      // can specify isoDate later
      type = 'LONGTEXT'
    } else if (s.type === 'integer') {
      type = 'INT(11)'
    } else if (s.type === 'number') {
      if (['unixTimestamp', 'int32'].includes((s as JsonSchemaNumber).format!)) {
        type = 'INT(11)'
      } else {
        type = 'FLOAT(11)'
      }
    } else if (s.type === 'boolean') {
      type = 'TINYINT(1)'
    } else if (s.instanceof === 'Buffer') {
      type = 'LONGBLOB'
    } else if (s.type === 'null') {
      type = 'VARCHAR(255)'
    } else if (s.type === 'array') {
      type = 'LONGTEXT' // to be JSON.stringified?
    } else if (s.type === 'object') {
      type = 'LONGTEXT' // to be JSON.stringified?
    } else {
      // default
      type = 'LONGTEXT'
    }

    const tokens: string[] = [mysql.escapeId(mapNameToMySQL(k)), type, `DEFAULT NULL`]

    return tokens.join(' ')
  })

  innerLines.push(`PRIMARY KEY (id)`)

  lines.push(innerLines.join(',\n'))
  lines.push(`) ENGINE=${engine}`)

  return lines.join('\n')
}

export function mysqlTableStatsToJsonSchemaField<T extends AnyObject = any>(
  table: string,
  stats: MySQLTableStats[],
  logger: CommonLogger,
): JsonSchemaRootObject<T> {
  const s: JsonSchemaRootObject<T> = {
    $id: `${table}.schema.json`,
    type: 'object',
    properties: {} as any,
    required: [],
    additionalProperties: true,
  }

  stats.forEach(stat => {
    const name = stat.Field as keyof T
    const t = stat.Type.toLowerCase()
    const notNull = stat.Null?.toUpperCase() !== 'YES'
    if (notNull) {
      s.required.push(name as any)
    }

    if (t.includes('text') || t.includes('char')) {
      s.properties[name] = { type: 'string' } as JsonSchemaString
    } else if (t.includes('lob')) {
      s.properties[name] = { instanceof: 'Buffer' }
    } else if (t.startsWith('tinyint') || t.includes('(1)')) {
      s.properties[name] = { type: 'boolean' } as JsonSchemaBoolean
    } else if (t === 'int' || t.startsWith('int(')) {
      s.properties[name] = { type: 'integer' } as JsonSchemaNumber
    } else if (t.startsWith('float')) {
      s.properties[name] = { type: 'number' } as JsonSchemaNumber
    } else {
      logger.log(s)
      throw new Error(`Unknown mysql field type ${name as string} ${stat.Type}`)
    }
  })

  return s
}

/**
 * Because MySQL doesn't support `.` in field names and escapes them as tableName + fieldName.
 *
 * @param name
 */
export function mapNameToMySQL(name: string): string {
  return name.replaceAll('.', '_dot_')
}

export function mapNameFromMySQL(name: string): string {
  return name.replaceAll('_dot_', '.')
}
