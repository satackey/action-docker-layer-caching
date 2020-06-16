import * as core from '@actions/core'
import exec from 'actions-exec-listener'

import { LayerCache } from './src/LayerCache'
const main = async () => {
  const repotag = core.getInput('repotag', { required: true })
  const primaryKey = core.getInput('key', { required: true })

  if (JSON.parse(core.getState(`exists-primary-key`)) === true) {
    core.info(`Key ${primaryKey} already exists, aborting.`)
    return
  }

  const alreadyExistingImageIds = JSON.parse(core.getState(`already-existing-image-ids`)) as string[]

  const currentImageIds = (await exec.exec(`docker image ls -q`)).stdoutStr.split(`\n`).filter(id => id !== ``)

  const imageIdsToSave = new Set([...currentImageIds])
  alreadyExistingImageIds.forEach(id => imageIdsToSave.delete(id))

  const layerCache = new LayerCache(Array.from(imageIdsToSave))
  await layerCache.store(primaryKey)
  await layerCache.cleanUp()
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
