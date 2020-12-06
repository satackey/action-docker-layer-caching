import * as core from '@actions/core'
import * as exec from 'actions-exec-listener'
import { LayerCache } from './src/LayerCache'
import {  ImageDetector } from './src/ImageDetector'

const main = async () => {
  const primaryKey = core.getInput(`key`, { required: true })
  const restoreKeys = core.getInput(`restore-keys`, { required: false }).split(`\n`).filter(key => key !== ``)

  const imageDetector = new ImageDetector()

  const alreadyExistingImages = await imageDetector.getExistingImages()
  core.saveState(`already-existing-images`, JSON.stringify(alreadyExistingImages))

  const layerCache = new LayerCache([])
  layerCache.concurrency = parseInt(core.getInput(`concurrency`, { required: true }), 10)
  const restoredKey = await layerCache.restore(primaryKey, restoreKeys)
  await layerCache.cleanUp()

  core.saveState(`restored-key`, JSON.stringify(restoredKey !== undefined ? restoredKey : ''))
  core.saveState(`restored-images`, JSON.stringify(await imageDetector.getImagesShouldSave(alreadyExistingImages)))
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)

  core.saveState(`restored-key`, JSON.stringify(``))
  core.saveState(`restored-images`, JSON.stringify([]))
})
