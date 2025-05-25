import type {
  AirtableAttachment,
  AirtableBaseDaoCfg,
  AirtableConnector,
  AirtableDaoOptions,
  AirtableId,
  AirtableLibCfg,
  AirtableRecord,
  AirtableTableCfg,
  AirtableTableCfgMap,
  AirtableThumbnail,
  AirtableThumbnails,
} from './airtable.model.js'
import {
  airtableAttachmentSchema,
  airtableAttachmentsSchema,
  AirtableErrorCode,
  airtableIdSchema,
  airtableMultipleLinkSchema,
  airtableRecordSchema,
  airtableSingleLinkSchema,
  airtableThumbnailSchema,
} from './airtable.model.js'
import { sortAirtableBase } from './airtable.util.js'
import { AirtableBaseDao } from './airtableBaseDao.js'
import { AirtableBasesDao } from './airtableBasesDao.js'
import type {
  AirtableDBCfg,
  AirtableDBOptions,
  AirtableDBSaveOptions,
  AirtableDBStreamOptions,
} from './airtableDB.js'
import { AirtableDB } from './airtableDB.js'
import { AirtableLib } from './airtableLib.js'
import { AirtableTableDao } from './airtableTableDao.js'
import type { AirtableJsonConnectorCfg } from './connector/airtableJsonConnector.js'
import {
  AIRTABLE_CONNECTOR_JSON,
  AirtableJsonConnector,
} from './connector/airtableJsonConnector.js'
import {
  AIRTABLE_CONNECTOR_REMOTE,
  AirtableRemoteConnector,
} from './connector/airtableRemoteConnector.js'

export type {
  AirtableAttachment,
  AirtableBaseDaoCfg,
  AirtableConnector,
  AirtableDaoOptions,
  AirtableDBCfg,
  AirtableDBOptions,
  AirtableDBSaveOptions,
  AirtableDBStreamOptions,
  AirtableId,
  AirtableJsonConnectorCfg,
  AirtableLibCfg,
  AirtableRecord,
  AirtableTableCfg,
  AirtableTableCfgMap,
  AirtableThumbnail,
  AirtableThumbnails,
}

export {
  AIRTABLE_CONNECTOR_JSON,
  AIRTABLE_CONNECTOR_REMOTE,
  airtableAttachmentSchema,
  airtableAttachmentsSchema,
  AirtableBaseDao,
  AirtableBasesDao,
  AirtableDB,
  AirtableErrorCode,
  airtableIdSchema,
  AirtableJsonConnector,
  AirtableLib,
  airtableMultipleLinkSchema,
  airtableRecordSchema,
  AirtableRemoteConnector,
  airtableSingleLinkSchema,
  AirtableTableDao,
  airtableThumbnailSchema,
  sortAirtableBase,
}
