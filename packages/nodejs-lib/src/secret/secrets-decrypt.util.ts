import fs from 'node:fs'
import path from 'node:path'
import { _assert } from '@naturalcycles/js-lib/error'
import { globSync } from 'tinyglobby'
import { dimGrey, yellow } from '../colors/colors.js'
import { fs2 } from '../fs/fs2.js'
import { decryptObject, decryptRandomIVBuffer } from '../security/crypto.util.js'

export interface DecryptCLIOptions {
  dir: string[]
  file?: string
  encKeyBuffer: Buffer
  del?: boolean
  jsonMode?: boolean
}

// Debug it like this:
// pn tsx scripts/./src/bin/secrets-encrypt.ts --file ./src/test/secrets2.plain.json --jsonMode --encKey MPd/30v0Zcce4I5mfwF4NSXrpTYD9OO4/fIqw6rjNiWp2b1GN9Xm8nQZqr7c9kKSsATqtwe0HkJFDUGzDSow44GDgDICgB1u1rGa5eNqtxnOVGRR+lIinCvN/1OnpjzeoJy2bStXPj1DKx8anMqgA8SoOZdlWRNSkEeZlolru8Ey0ujZo22dfwMyRIEniLcqvBm/iMiAkV82fn/TxYw05GarAoJcrfPeDBvuOXsARnMCyX18qTFL0iojxeTU8JHxr8TX3eXDq9cJJmridEKlwRIAzADwtetI4ttlP8lwJj1pmgsBIN3iqYssZYCkZ3HMV6BoEc7LTI5z/45rKrAT1A==
// pn tsx scripts/./src/bin/secrets-decrypt.ts --file ./src/test/secrets2.json --jsonMode --encKey MPd/30v0Zcce4I5mfwF4NSXrpTYD9OO4/fIqw6rjNiWp2b1GN9Xm8nQZqr7c9kKSsATqtwe0HkJFDUGzDSow44GDgDICgB1u1rGa5eNqtxnOVGRR+lIinCvN/1OnpjzeoJy2bStXPj1DKx8anMqgA8SoOZdlWRNSkEeZlolru8Ey0ujZo22dfwMyRIEniLcqvBm/iMiAkV82fn/TxYw05GarAoJcrfPeDBvuOXsARnMCyX18qTFL0iojxeTU8JHxr8TX3eXDq9cJJmridEKlwRIAzADwtetI4ttlP8lwJj1pmgsBIN3iqYssZYCkZ3HMV6BoEc7LTI5z/45rKrAT1A==

// pn tsx scripts/./src/bin/secrets-encrypt.ts --file ./src/test/secrets.json -encKey MPd/30v0Zcce4I5mfwF4NSXrpTYD9OO4/fIqw6rjNiWp2b1GN9Xm8nQZqr7c9kKSsATqtwe0HkJFDUGzDSow44GDgDICgB1u1rGa5eNqtxnOVGRR+lIinCvN/1OnpjzeoJy2bStXPj1DKx8anMqgA8SoOZdlWRNSkEeZlolru8Ey0ujZo22dfwMyRIEniLcqvBm/iMiAkV82fn/TxYw05GarAoJcrfPeDBvuOXsARnMCyX18qTFL0iojxeTU8JHxr8TX3eXDq9cJJmridEKlwRIAzADwtetI4ttlP8lwJj1pmgsBIN3iqYssZYCkZ3HMV6BoEc7LTI5z/45rKrAT1A==
// pn tsx scripts/./src/bin/secrets-decrypt.ts --file ./src/test/secrets.json.enc -encKey MPd/30v0Zcce4I5mfwF4NSXrpTYD9OO4/fIqw6rjNiWp2b1GN9Xm8nQZqr7c9kKSsATqtwe0HkJFDUGzDSow44GDgDICgB1u1rGa5eNqtxnOVGRR+lIinCvN/1OnpjzeoJy2bStXPj1DKx8anMqgA8SoOZdlWRNSkEeZlolru8Ey0ujZo22dfwMyRIEniLcqvBm/iMiAkV82fn/TxYw05GarAoJcrfPeDBvuOXsARnMCyX18qTFL0iojxeTU8JHxr8TX3eXDq9cJJmridEKlwRIAzADwtetI4ttlP8lwJj1pmgsBIN3iqYssZYCkZ3HMV6BoEc7LTI5z/45rKrAT1A==

/**
 * Decrypts all files in given directory (*.enc), saves decrypted versions without ending `.enc`.
 * Using provided encKey.
 */
export function secretsDecrypt(
  dir: string[],
  file: string | undefined,
  encKeyBuffer: Buffer,
  del = false,
  jsonMode = false,
): void {
  // If `file` is provided - only this one file is used
  const patterns = file ? [file] : dir.map(d => `${d}/**/*.enc`)

  const filenames = globSync(patterns)

  filenames.forEach(filename => {
    let plainFilename: string

    if (jsonMode) {
      _assert(filename.endsWith('.json'), `${path.basename(filename)} MUST end with '.json'`)
      _assert(
        !filename.endsWith('.plain.json'),
        `${path.basename(filename)} MUST NOT end with '.plain.json'`,
      )
      plainFilename = filename.replace('.json', '.plain.json')

      const json = decryptObject(fs2.readJson(filename), encKeyBuffer)

      fs2.writeJson(plainFilename, json, { spaces: 2 })
    } else {
      const enc = fs.readFileSync(filename)
      const plain = decryptRandomIVBuffer(enc, encKeyBuffer)
      plainFilename = filename.slice(0, filename.length - '.enc'.length)
      fs.writeFileSync(plainFilename, plain)
    }

    if (del) {
      fs.unlinkSync(filename)
    }

    console.log(`  ${path.basename(filename)} > ${path.basename(plainFilename)}`)
  })

  console.log(`decrypted ${yellow(filenames.length)} files in ${dimGrey(dir.join(' '))}`)
}
