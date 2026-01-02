export interface WorkerInput<IN = any> {
  /**
   * Index of the chunk received (global), which identifies the message. Starts with 0.
   */
  index: number

  /**
   * Input chunk data.
   */
  payload: IN
}

export interface WorkerOutput<OUT = any> {
  /**
   * Index of the chunk received (global), which identifies the message. Starts with 0.
   */
  index: number

  /**
   * Output of the worker.
   */
  payload: OUT

  /**
   * Returned if WorkerClass.process returned an error (rejected Promise).
   * Payload is undefined in such case, so error should be checked first.
   */
  error?: Error
}

export interface BaseWorkerData {
  workerFile: string

  /**
   * @default worker
   */
  metric: string

  workerIndex: number

  /**
   * @default 1000
   */
  logEvery: number

  silent?: boolean
}
