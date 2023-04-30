import { assert } from 'typia' 
import { promises as fs } from 'fs'
import * as path from 'path'

export interface Manifest {
  Config: string
  RepoTags: string[] | null
  Layers: string[]
}

export type Manifests = Manifest[]

export function assertManifests(x: unknown): asserts x is Manifests {
  assert<Manifests>(x)
}

export async function loadRawManifests(rootPath: string) {
  return (await fs.readFile(path.join(rootPath, `manifest.json`))).toString()
}

export async function loadManifests(path: string) {
  const raw = await loadRawManifests(path)
  const manifests = JSON.parse(raw.toString())
  assertManifests(manifests)
  return manifests
}
