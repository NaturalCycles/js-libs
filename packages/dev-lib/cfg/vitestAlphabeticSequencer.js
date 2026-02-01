import { _sortBy } from '@naturalcycles/js-lib/array/sort.js'
import { BaseSequencer } from 'vitest/node'

export class VitestAlphabeticSequencer extends BaseSequencer {
  async sort(files) {
    // console.log('sort', files.length)
    return _sortBy(files, f => f.moduleId)
  }
  // Sharding method is untouched for now
  // async shard(files){
  //   console.log('shard', files.length)
  //   return files
  // }
}
