import * as core from '@actions/core'
import exec from 'actions-exec-listener'

import { LayerCache } from './src/LayerCache'
import { ImageDetector } from './src/ImageDetector'
import { assertType } from 'typescript-is'
const main = async () => {
  if (core.getInput('skip-save')) {
    core.info('Skipping save.')
    return
  }

  const primaryKey = core.getInput('key', { required: true })
  const restoredKey = JSON.parse(core.getState(`restored-key`)) as string

  const rawAlreadyExistingImages = core.getState(`already-existing-images`)
  assertType<string>(rawAlreadyExistingImages)
  const alreadyExistingImages = JSON.parse(rawAlreadyExistingImages)
  assertType<string[]>(alreadyExistingImages)

  const imageDetector = new ImageDetector()
  imageDetector.registerAlreadyExistedImages(alreadyExistingImages)
  await imageDetector.getExistingImages()
  core.debug(JSON.stringify({ imageIdsToSave: imageDetector.getImagesShouldSave() }))
  const layerCache = new LayerCache(imageDetector.getImagesShouldSave())
  layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10)

  layerCache.unformattedOrigianlKey = primaryKey
  core.debug(JSON.stringify({ restoredKey, formattedOriginalCacheKey: layerCache.getFormattedOriginalCacheKey()}))
  if (restoredKey !== `` && restoredKey === layerCache.getFormattedOriginalCacheKey()) {
    core.info(`Key ${restoredKey} already exists, skip storing.`)
    return
  }
  await layerCache.store(primaryKey)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
