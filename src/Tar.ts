import { assertType } from 'typescript-is' 

export interface Manifest {
  Config: string
  RepoTags: string[] | null
  Layers: string[]
}

export type Manifests = Manifest[]

export function assertManifests(x: unknown): asserts x is Manifests {
  assertType<Manifests>(x)
}
