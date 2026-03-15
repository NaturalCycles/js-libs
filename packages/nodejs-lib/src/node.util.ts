/**
 * Returns true if load was successful
 */
export function loadEnvFileIfExists(path = '.env'): boolean {
  try {
    process.loadEnvFile(path)
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // gracefully ignore that the file does not exist
      return false
    }

    throw err
  }
}
