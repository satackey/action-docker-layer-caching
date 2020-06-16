import * as core from '@actions/core'

import { LayerCache } from './src/LayerCache'

const main = async () => {
  const repotag = core.getInput(`repotag`, { required: true })
  const primaryKey = core.getInput(`key`, { required: true })
  const restoreKeys = core.getInput(`restore-keys`, { required: false }).split(`\n`).filter(key => key !== ``)

  const layerCache = new LayerCache(repotag)
  const restoredKey = await layerCache.restore(primaryKey, restoreKeys)
  await layerCache.cleanUp()

  core.saveState(`exists-primary-key`, primaryKey === restoredKey)
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
