import * as core from '@actions/core'

import { LayerCache } from './src/LayerCache'
const main = async () => {
  const repotag = core.getInput('repotag', { required: true })
  const key = core.getInput('key', { required: true })

  const layerCache = new LayerCache(repotag)
  await layerCache.store(key)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
