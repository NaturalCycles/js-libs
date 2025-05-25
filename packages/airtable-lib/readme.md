## @naturalcycles/airtable-lib

> High-level API and CLI for Airtable.

[![npm](https://img.shields.io/npm/v/@naturalcycles/airtable-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/airtable-lib)
[![](https://circleci.com/gh/NaturalCycles/airtable-lib.svg?style=shield&circle-token=123)](https://circleci.com/gh/NaturalCycles/airtable-lib)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Features

- Allows high level API access to Airtable contents
- Allows to download Airtable data to json (backup), upload it back with all links and order
  preserved (not trivial if using stock low-level api)
- Allows optional validation and transformation (mostly stripping and setting defaults) of data via
  Joi schemas.

# API

- `AirtableLib`: high-level access object
  - `fetchBase` ...
- `AirtableDao`: access object for Airtable Table
- `AirtableCache`: indexed contents of Airtable Base (indexed by airtableId)

# Concept

## Entities

Entities are preferrably named without "Airtable" in their name, e.g `Coupon`, not `AirtableCoupon`.

Entities extend `AirtableRecord` to have `airtableId` required property. Idea is to not strip it
unless absolutely needed. Currently `airtable-lib` doesn't do any stripping. Keeping `airtableId` is
useful to be able to resolve links in runtime. `AirtableCache` always keeps and index of all records
of Base by `airtableId`. `airtableId` is unique within your Base (not just within Table), that's why
index is built as `airtableId > record`, not `airtableId > Table > record`.

## Linking

Any linked field in Airtable creates link in both directions (between 2 tables). Convention is to
"hide" one link (typically "back-link") in Airtable UI to indicate that it's not used (if it's
indeed not used and stripped from data by joi schema).

There was an idea to have a "resolve step" when downloading Airtable Base as json, to be able to
replace `airtableId`s in links to whole objects. The problem there is that it creates a circular
dependency in javascript which is a very bad thing (e.g you cannot `console.log` such object, or
send it over the wire). Decision was made to NOT have a resolve step but instead have a
`AirtableCache` with the index of all base records (from `airtableId` to Record), so it's possible
to quickly resolve links in runtime. This is a design decision.

## Backup / restore

Backing up Airtable base to json file stores all `airtableId`s that are used to resolve links.

When restoring from json to Airtable Base `airtableId`s cannot be preserved, that's Airtable
limitation, it needs to generate an `airtableId` every time an "insert" is made. Restore still works
though, with some extra logic. It relies on existing links in json file, builds a map from
"oldAirtableId" to "newlyGeneratedAirtableId" and this way preserves the linking. Next time backup
to json is made from Airtable base - `airtableId`s will be different (non-deterministic), something
to be aware of.

Backing up (as per current Airtable API) **does not** preserve order of rows. Restoring from json -
**does** preserve order (but requires to upload records sequentially one-by-one, which is slower
than concurrent uploading). To overcome this limitation it's recommended to specify "sort order" in
`AirtableTableSchema`, which allows order to be deterministic. Same order needs to be applied in the
UI, to be consistent between UI and json export.

# Packaging

- `engines.node >= 10.13`: Latest Node.js LTS
- `main: dist/index.js`: commonjs, es2018
- `types: dist/index.d.ts`: typescript types
- `/src` folder with source `*.ts` files included
