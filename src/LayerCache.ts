import * as path from 'path'
import exec from 'actions-exec-listener'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { ExecOptions } from '@actions/exec/lib/interfaces'
import { promises as fs } from 'fs'
import { assertManifests, Manifest, Manifests } from './Tar'

class LayerCache {
  repotag: string
  originalKeyToStore: string = ''
  // tarFile: string = ''
  imagesDir: string = `.docker_images`
  // unpackedTarDir: string = ''
  // manifests: Manifests = []

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
    this.originalKeyToStore = key
    await this.saveImageAsUnpacked()
    await this.separateAllLayerCaches()
    const storeRoot = this.storeRoot()
    const storeLayers = this.storeLayers()
    try {
      await Promise.all([storeRoot, storeLayers])
    } catch (e) {
      if (typeof e.message !== 'string' || !e.message.includes(`Cache already exists`)) {
        throw e
      }
      core.info(`Cache already exists, key: ${this.getRootKey()}`)
      core.debug(e)
    }
  }

  private async saveImageAsUnpacked() {
    await this.exec('mkdir -p', [this.getSavedImageTarDir()])
    await this.exec(`sh -c`, [`docker save '${(await this.makeRepotagsDockerSaveArgReady([this.repotag])).join(`' '`)}' | tar xf - -C ${this.getSavedImageTarDir()}`])
  }

  private async makeRepotagsDockerSaveArgReady(repotags: string[]): Promise<string[]> {
    const getMiddleIdsWithRepotag = async (id: string): Promise<string[]> => {
      return [id, ...(await this.getAllImageIdsFrom(id))]
    }
    return (await Promise.all(repotags.map(getMiddleIdsWithRepotag))).flat()
  }

  private async getAllImageIdsFrom(repotag: string): Promise<string[]> {
    const { stdoutStr: rawHistoryIds } = await this.exec(`docker history -q`, [repotag])
    const historyIds = rawHistoryIds.split(`\n`).filter(id => id !== `<missing>` && id !== ``)
    return historyIds
  }

  private async getManifests() {
    const manifests = JSON.parse((await fs.readFile(`${this.getUnpackedTarDir()}/manifest.json`)).toString())
    assertManifests(manifests)
    return manifests
  }

  private async storeRoot() {
    const rootKey = this.getRootKey()
    const paths = [
      this.getUnpackedTarDir(),
      ...(await this.getLayerTarFiles()).map(file => `!${file}`)
    ]
    core.info(`Start storing root cache: ${rootKey}`)
    const cacheId = await cache.saveCache(paths, rootKey)
    core.info(`Stored root cache, key: ${rootKey}, id: ${cacheId}`)
    return cacheId
  }

  private async separateAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getUnpackedTarDir(), this.getLayerCachesDir())
  }

  private async joinAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getLayerCachesDir(), this.getUnpackedTarDir())
  }

  private async moveLayerTarsInDir(fromDir: string, toDir: string) {
    const layerTars = (await exec.exec(`find . -name layer.tar`, [], { cwd: fromDir, silent: true })).stdoutStr.split(`\n`).filter(tar => tar !== '')
    const moveLayer = async (layer: string) => {
      const from = path.resolve(`${fromDir}/${layer}`)
      const to = path.resolve(`${toDir}/${layer}`)
      core.debug(`Moving layer tar from ${from} to ${to}`)
      await fs.mkdir(`${path.dirname(to)}`, { recursive: true })
      await fs.rename(from, to)
    }
    await Promise.all(layerTars.map(moveLayer))
  }

  private async storeLayers() {
    const storing = (await this.getLayerIds()).map(layerId => this.storeSingleLayerBy(layerId))
    const cacheIds = await Promise.all(storing)
    return cacheIds
  }

  private async storeSingleLayerBy(id: string) {
    const path = this.genSingleLayerStorePath(id)
    const key = this.genSingleLayerStoreKey(id)

    core.info(`Start storing layer cache: ${key}`)
    const cacheId = await cache.saveCache([path], key)
    core.info(`Stored layer cache, key: ${key}, id: ${cacheId}`)

    return cacheId
  }

  // ---

  async restore(key: string, restoreKeys?: string[]) {
    this.originalKeyToStore = key
    const restoreKeysIncludedRootKey = [key, ...(restoreKeys !== undefined ? restoreKeys : [])]
    const hasRestoredRootCache = await this.restoreRoot(restoreKeysIncludedRootKey)
    if (!hasRestoredRootCache) {
      core.info(`Root cache could not be found. aborting.`)
      return false
    }

    const hasRestoredAllLayers = await this.restoreLayers()
    if (!hasRestoredAllLayers) {
      core.info(`Some layer cache could not be found. aborting.`)
      return false
    }
    await this.joinAllLayerCaches()
    await this.loadImageFromUnpacked()
    return true
  }

  private async restoreRoot(restoreKeys?: string[]): Promise<boolean> {
    core.debug(`Trying to restore root cache ID: ${this.getRootKey()}`)
    const restoredCacheKeyMayUndefined = await cache.restoreCache([this.getUnpackedTarDir()], this.getRootKey(), restoreKeys)
    core.debug(`restoredCacheKeyMayUndefined: ${restoredCacheKeyMayUndefined}`)
    if (restoredCacheKeyMayUndefined === undefined) {
      return false
    }
    this.originalKeyToStore = restoredCacheKeyMayUndefined.replace(/-root$/, '')
    return true
  }

  private async restoreLayers() {
    const restoring = (await this.getLayerIds()).map(layerId => this.restoreSingleLayerBy(layerId))
    const hasRestored = await Promise.all(restoring)
    const FailedToRestore = (restored: Boolean) => !restored
    return hasRestored.filter(FailedToRestore).length === 0
  }

  private async restoreSingleLayerBy(id: string): Promise<boolean> {
    const restoredCacheKeyMayUndefined = await cache.restoreCache([this.genSingleLayerStorePath(id)], this.genSingleLayerStoreKey(id))
    return typeof restoredCacheKeyMayUndefined === `string`
  }

  private async loadImageFromUnpacked() {
    await exec.exec(`sh -c`, [`(tar cf - . && (echo tar creation has just finished 1>&2)) | docker load`], { cwd: this.getUnpackedTarDir() })
  }

  async cleanUp() {
    await fs.rmdir(this.getImagesDir(), { recursive: true })
  }

  // ---

  getImagesDir(): string {
    return this.imagesDir
  }

  getUnpackedTarDir(): string {
    return `${this.getImagesDir()}/${this.getRepotagPathFriendly()}`
  }

  getLayerCachesDir() {
    return `${this.getUnpackedTarDir()}-layers`
  }

  getSavedImageTarDir(): string {
    return `${this.getImagesDir()}/${this.getRepotagPathFriendly()}`
  }

  getRepotagPathFriendly(): string {
    return this.repotag.replace('/', '-') 
  }

  getRootKey(): string {
    return `${this.originalKeyToStore}-root`
  }

  genSingleLayerStorePath(id: string) {
    return `${this.getLayerCachesDir()}/${id}/layer.tar`
  }

  genSingleLayerStoreKey(id: string) {
    return `layer-${this.originalKeyToStore}-${id}`
  }

  async getLayerTarFiles(): Promise<string[]> {
    const getTarFilesFromManifest = (manifest: Manifest) => manifest.Layers
    const addStringArray = (tarFilesOfAManifest: string[], tarFiles: string[]) => tarFiles.concat(...tarFilesOfAManifest)

    // Todo: use Array#flatMap
    const tarFilesPerManifest = (await this.getManifests()).map(getTarFilesFromManifest)
    const tarFiles = tarFilesPerManifest.reduce(addStringArray, [])
    return tarFiles
  }

  async getLayerIds(): Promise<string[]> {
    const getIdfromLayerRelativePath = (path: string) => path.replace('/layer.tar', '')
    return (await this.getLayerTarFiles()).map(getIdfromLayerRelativePath)
  }
}

export { LayerCache }
