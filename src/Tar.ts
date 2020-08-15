import { assertType } from 'typescript-is' 
import { promises as fs } from 'fs'

export interface Manifest {
  Config: string
  RepoTags: string[] | null
  Layers: string[]
}

export type Manifests = Manifest[]

export function assertManifests(x: unknown): asserts x is Manifests {
  assertType<Manifests>(x)
}

export async function loadRawManifests(path: string) {
  return (await fs.readFile(`${path}/manifest.json`)).toString()
}

export async function loadManifests(path: string) {
  const raw = await loadRawManifests(path)
  const manifests = JSON.parse(raw.toString())
  assertManifests(manifests)
  return manifests
}
