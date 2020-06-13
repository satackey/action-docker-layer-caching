import * as path from 'path'
import exec from 'actions-exec-listener'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { ExecOptions } from '@actions/exec/lib/interfaces'
import { promises as fs } from 'fs'
import { assertManifests, Manifest, Manifests } from './Tar'

class LayerCache {
  repotag: string
  key: string = ''
  tarFile: string = ''
  unpackedTarDir: string = ''
  manifests: Manifests = []

  constructor(repotag: string) {
    this.repotag = repotag
  }

  async exec(command: string, args?: string[], options?: ExecOptions) {
    const argsStr = args != null ? args.join(' ') : ''
    core.startGroup(`${command} ${argsStr}`)
    const result = await exec.exec(command, args, options)
    core.endGroup()

    return result
  }

  async store(key: string) {
    await this.unpackImage(`${__dirname}/docker_images`)
    this.key = key
    const storeRoot = this.storeRoot()
    const storeLayers = this.storeLayers()
    await Promise.all([storeRoot, storeLayers])
  }

  async restore(key: string, restoreKeys?: string[]) {

  }

  private async unpackImage(dir: string) {
    const path = this.repotag.replace('/', '-') 
    await this.saveTarTo(`${dir}/${path}.tar`)
    await this.UnpackTarTo(`${dir}/${path}`)
  }

  private async saveTarTo(file: string) {
    await this.exec('mkdir -p', [path.dirname(file)])
    await this.exec('docker save', ['-o', file, this.repotag])
    this.tarFile = file
  }

  private async UnpackTarTo(dir: string) {
    await this.exec('mkdir -p', [dir])
    await this.exec('tar xvf', [this.tarFile], { cwd: dir })
    this.unpackedTarDir = dir
    await this.getManifests()
  }

  private async getManifests() {
    const manifests = JSON.parse((await fs.readFile(`${this.unpackedTarDir}/manifest.json`)).toString())
    assertManifests(manifests)
    this.manifests = manifests
  }

  private async storeRoot() {
    const rootKey = `${this.key}-root`
    const paths = [
      this.unpackedTarDir,
      ...this.getLayerTarFiles().map(file => `!${file}`)
    ]
    core.info(`Start storing root cache: ${rootKey}`)
    const cacheId = await cache.saveCache(paths, rootKey)
    core.info(`Stored root cache, key: ${rootKey}, id: ${cacheId}`)
    return cacheId
  }

  private async storeLayers() {
    const storing = this.getLayerIds().map(layerId => this.storeSingleLayerBy(layerId))
    const cacheIds = await Promise.all(storing)
    return cacheIds
  }

  private async storeSingleLayerBy(id: string) {
    const path = `${this.unpackedTarDir}/${id}/layer.tar`
    const key = `layer-${this.key}-${id}`

    core.info(`Start storing layer cache: ${key}`)
    const cacheId = await cache.saveCache([path], key)
    core.info(`Stored layer cache, key: ${key}, id: ${cacheId}`)

    return cacheId
  }

  getLayerTarFiles(): string[] {
    const getTarFilesFromManifest = (manifest: Manifest) => manifest.Layers
    const addStringArray = (tarFilesOfAManifest: string[], tarFiles: string[]) => tarFiles.concat(...tarFilesOfAManifest)

    // Todo: use Array#flatMap
    const tarFilesPerManifest = this.manifests.map(getTarFilesFromManifest)
    const tarFiles = tarFilesPerManifest.reduce(addStringArray, [])
    return tarFiles
  }

  getLayerIds(): string[] {
    const getIdfromLayerRelativePath = (path: string) => path.replace('/layer.tar', '')
    return this.getLayerTarFiles().map(getIdfromLayerRelativePath)
  }
}

export { LayerCache }
