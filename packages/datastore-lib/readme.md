## @naturalcycles/datastore-lib

> Opinionated library to work with Google Datastore

[![npm](https://img.shields.io/npm/v/@naturalcycles/datastore-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/datastore-lib)
[![](https://circleci.com/gh/NaturalCycles/datastore-lib.svg?style=shield&circle-token=cbb20b471eb9c1d5ed975e28c2a79a45671d78ea)](https://circleci.com/gh/NaturalCycles/datastore-lib)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Features

- BaseDao abstract class for extension
- DBM / BM / FM models, conversion, validation
- DB fields convention (`created`, `updated`, `_ver`)
- Simplified ID handling (always String ids)
- Simple and powerful In-Memory Datastore emulator for faster and safer unit testing (!)
- Streaming with RxJS Observable interface
- Anonymization hook to be able to plug your implementation (privacy by design)
- ...

# Packaging

- `engines.node >= 10.13`: Latest Node.js LTS
- `main: dist/index.js`: commonjs, es2018
- `types: dist/index.d.ts`: typescript types
- `/src` folder with source `*.ts` files included
