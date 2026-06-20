import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Readable } from 'node:stream'

const ASSET_DIR = resolve('.assets')

export async function storeAsset(id: string, stream: Readable) {
  await mkdir(ASSET_DIR, { recursive: true })
  await writeFile(join(ASSET_DIR, sanitizeAssetId(id)), stream)
}

export async function loadAsset(id: string) {
  return await readFile(join(ASSET_DIR, sanitizeAssetId(id)))
}

function sanitizeAssetId(id: string) {
  return id.replace(/[^a-zA-Z0-9._-]/g, '_')
}
