import type {
  NonNegativeInteger,
  NumberOfMilliseconds,
  NumberOfSeconds,
  PositiveInteger,
  UnixTimestamp,
} from '@naturalcycles/js-lib/types'

export interface CloudRunDeployInfo {
  //
  // GCP settings
  //
  gcpProject: string
  /**
   * Name of the Cloud Run service.
   */
  cloudRunService: string
  cloudRunServiceBase: string // todo: review
  runtimeServiceAccount: string
  /**
   * GCP region where the Cloud Run service is deployed. Example: 'europe-west1'
   */
  cloudRunRegion: string
  sqlInstance?: string
  vpcConnector?: string
  //
  // Urls
  //
  serviceUrl?: string
  /**
   * Service URL that is used to access the service externally (through load balancer)
   * todo: overlaps with env.K_EXTERNAL_URL
   */
  externalUrl?: string
  //
  // Versioning
  //
  buildVersion: string // todo: overlaps with env.BUILD_VERSION
  /**
   * Unix timestamp of the build/deployment time.
   */
  tsUnix: UnixTimestamp
  //
  // Docker
  //
  targetDockerImageId: string
  dockerImageTag: string
  //
  // Git
  //
  /**
   * Short SHA of the commit used for this deployment.
   */
  gitRev: string
  gitBranch: string
  //
  // Cloud Run environment settings
  //
  /**
   * Example: 'APP_ENV=prod,BUILD_VERSION=abcd,a=b'
   */
  envString: string
  /**
   * Example: httpGet.path='/',httpGet.port=8080,initialDelaySeconds=3,failureThreshold=50,timeoutSeconds=1,periodSeconds=2
   */
  startupProbeConfigString: string
  minInstances: NonNegativeInteger
  maxInstances: PositiveInteger
  /**
   * CloudRun concurrency setting.
   * Example: 80
   */
  concurrency: PositiveInteger
  /**
   * Example: '512Mi'
   */
  memoryPerInstance: string
}

export interface CloudRunStartupProbeConfig {
  /**
   * Example: '/'
   */
  'httpGet.path': string
  'httpGet.port': PositiveInteger
  initialDelaySeconds: NumberOfSeconds
  failureThreshold: PositiveInteger
  timeoutSeconds: NumberOfSeconds
  periodSeconds: NumberOfSeconds
}

/**
 * Experimental, subject to change.
 */
export const defaultStartupProbeConfig: CloudRunStartupProbeConfig = {
  'httpGet.path': '/',
  'httpGet.port': 8080,
  initialDelaySeconds: 3,
  failureThreshold: 50,
  timeoutSeconds: 1,
  periodSeconds: 2,
}

export interface CloudRunEnv {
  APP_ENV: string
  /**
   * Example: '--max-old-space-size=864'
   */
  NODE_OPTIONS?: string
  /**
   * Example: '2025-09-01T15:23:20.769Z'
   * The result of running `new Date().toISOString()`
   */
  DEPLOY_BUILD_TIME: string
  /**
   * Example: 'abcd'
   * Should match the name of the GCP project.
   */
  GOOGLE_CLOUD_PROJECT: string
  /**
   * Anything (a string) that would identify the build.
   */
  BUILD_VERSION: string
  /**
   * External url of the deployed service.
   */
  K_EXTERNAL_URL?: string
  // UV_THREADPOOL_SIZE?: number

  OTEL_SERVICE_NAME?: string
  OTEL_METRICS_EXPORTER?: 'console' | 'otlp' | string
  OTEL_METRIC_EXPORT_INTERVAL?: NumberOfMilliseconds
  OTEL_METRIC_EXPORT_TIMEOUT?: NumberOfMilliseconds
  OTEL_EXPORTER_OTLP_PROTOCOL?: 'http/protobuf' | string
  /**
   * Example: 'http://localhost:4317'
   */
  OTEL_EXPORTER_OTLP_ENDPOINT?: string
  OTEL_LOG_LEVEL?: 'INFO' | 'DEBUG'
}
