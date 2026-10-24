const { K_SERVICE } = process.env

export function isCloudRun(): boolean {
  return !!K_SERVICE
}
