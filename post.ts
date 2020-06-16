import * as core from '@actions/core'
import exec from 'actions-exec-listener'

import { LayerCache } from './src/LayerCache'
const main = async () => {
  const primaryKey = core.getInput('key', { required: true })
  const restoredKey = JSON.parse(core.getState(`restored-key`)) as string
  const alreadyExistingImageIds = JSON.parse(core.getState(`already-existing-image-ids`)) as string[]
  const currentImageIds = (await exec.exec(`docker image ls -q`)).stdoutStr.split(`\n`).filter(id => id !== ``)
  const imageIdsToSave = new Set([...currentImageIds])
  alreadyExistingImageIds.forEach(id => imageIdsToSave.delete(id))

  core.debug(JSON.stringify({ imageIdsToSave }))
  const layerCache = new LayerCache(Array.from(imageIdsToSave))

  core.debug(JSON.stringify({ restoredKey, formattedOriginalCacheKey: layerCache.getFormattedOriginalCacheKey()}))
  if (restoredKey !== `` && restoredKey === layerCache.getFormattedOriginalCacheKey()) {
    core.info(`Key ${restoredKey} already exists, aborting.`)
    return
  }
  await layerCache.store(primaryKey)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
