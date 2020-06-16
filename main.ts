import * as core from '@actions/core'
import exec from 'actions-exec-listener'
import { LayerCache } from './src/LayerCache'

const main = async () => {
  // const repotag = core.getInput(`repotag`, { required: true })
  const primaryKey = core.getInput(`key`, { required: true })
  const restoreKeys = core.getInput(`restore-keys`, { required: false }).split(`\n`).filter(key => key !== ``)

  core.saveState(`already-existing-image-ids`, (await exec.exec(`docker image ls -q`)).stdoutStr.split(`\n`).filter(id => id !== ``))

  const layerCache = new LayerCache([])
  const restoredKey = await layerCache.restore(primaryKey, restoreKeys)
  await layerCache.cleanUp()

  core.saveState(`restored-key`, JSON.stringify(restoredKey !== undefined ? restoredKey : ''))
}

main().catch(e => {
  console.error(e)
  core.setFailed(e)
})
