import * as core from '@actions/core'

import { LayerCache } from './src/LayerCache'
import { ImageDetector } from './src/ImageDetector'
import { assert } from 'typia'

const main = async () => {
  if (JSON.parse(core.getInput('skip-save', { required: true }))) {
    core.info('Skipping save.')
    return
  }

  const primaryKey = core.getInput('key', { required: true })

  const restoredKey = JSON.parse(core.getState(`restored-key`))
  const alreadyExistingImages = JSON.parse(core.getState(`already-existing-images`))
  const restoredImages = JSON.parse(core.getState(`restored-images`))

  assert<string>(restoredKey)
  assert<string[]>(alreadyExistingImages)
  assert<string[]>(restoredImages)

  const imageDetector = new ImageDetector()

  const existingAndRestoredImages = alreadyExistingImages.concat(restoredImages)
  const newImages = await imageDetector.getImagesShouldSave(existingAndRestoredImages)
  if (newImages.length < 1) {
    core.info(`There is no image to save.`)
    return
  }

  const imagesToSave = await imageDetector.getImagesShouldSave(alreadyExistingImages)
  const layerCache = new LayerCache(imagesToSave)
  layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10)

  await layerCache.store(primaryKey)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
