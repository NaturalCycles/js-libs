## @naturalcycles/redis-lib

> Redis implementation of CommonKeyValueDB interface

[![npm](https://img.shields.io/npm/v/@naturalcycles/redis-lib/latest.svg)](https://www.npmjs.com/package/@naturalcycles/redis-lib)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Features

- ...

# Starting / debugging Redis server on OSX

```shell
brew install redis
brew services start redis
brew services stop redis

redis-server /usr/local/etc/redis.conf

redis-cli ping
redis-cli flushall

# connect and list all keys
redis-cli
scan 0
```

Location and size of local DB:

    ls -l /usr/local/var/db/redis/dump.rdb
