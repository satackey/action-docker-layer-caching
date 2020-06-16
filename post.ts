import * as core from '@actions/core'

import { LayerCache } from './src/LayerCache'
const main = async () => {
  const repotag = core.getInput('repotag', { required: true })
  const primaryKey = core.getInput('key', { required: true })

  if (JSON.parse(core.getState(`exists-primary-key`)) === true) {
    core.info(`Key ${primaryKey} already exists, aborting.`)
    return
  }

  const layerCache = new LayerCache(repotag)
  await layerCache.store(primaryKey)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
