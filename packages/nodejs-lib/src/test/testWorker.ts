import { pDelay } from '@naturalcycles/js-lib/promise'
import { BaseWorkerClass } from '../stream/index.js'

export class WorkerClass extends BaseWorkerClass<any, any> {
  async process(msg: any, index: number): Promise<any> {
    if (index >= 10) {
      throw new Error(`error from worker#${this.workerData.workerIndex}`)
    }

    await pDelay(200)
    return msg // echo
  }
}
