import * as path from 'path'
import exec from 'actions-exec-listener'
import crypto from 'crypto'
import * as core from '@actions/core'
import * as cache from '@actions/cache'
import { ExecOptions } from '@actions/exec/lib/interfaces'
import { promises as fs } from 'fs'
import recursiveReaddir from 'recursive-readdir'
import { Manifest, loadManifests, loadRawManifests } from './Tar'
import format from 'string-format'
import PromisePool from 'native-promise-pool'

class LayerCache {
  ids: string[] = []
  unformattedSaveKey: string = ''
  restoredRootKey: string = ''
  imagesDir: string = path.resolve(`${__dirname}/../.action-docker-layer-caching-docker_images`)
  enabledParallel = true
  concurrency: number = 4

  static ERROR_CACHE_ALREAD_EXISTS_STR = `Cache already exists`
  static ERROR_LAYER_CACHE_NOT_FOUND_STR = `Layer cache not found`

  constructor(ids: string[]) {
    this.ids = ids
  }

  async exec(command: string, args?: string[], options?: ExecOptions) {
    const result = await exec.exec(command, args, options)

    return result
  }

  async store(key: string) {
    this.unformattedSaveKey = key

    await this.saveImageAsUnpacked()
    if (this.enabledParallel) {
      await this.separateAllLayerCaches()
    }

    if (await this.storeRoot() === undefined) {
      core.info(`cache key already exists, aborting.`)
      return false
    }

    await Promise.all(this.enabledParallel ? await this.storeLayers() : [])
    return true
  }

  private async saveImageAsUnpacked() {
    await fs.mkdir(this.getSavedImageTarDir(), { recursive: true })
    await this.exec(`sh -c`, [`docker save '${(await this.makeRepotagsDockerSaveArgReady(this.ids)).join(`' '`)}' | tar xf - -C .`], { cwd: this.getSavedImageTarDir() })
  }

  private async makeRepotagsDockerSaveArgReady(repotags: string[]): Promise<string[]> {
    const getMiddleIdsWithRepotag = async (id: string): Promise<string[]> => {
      return [id, ...(await this.getAllImageIdsFrom(id))]
    }
    return (await Promise.all(repotags.map(getMiddleIdsWithRepotag))).flat()
  }

  private async getAllImageIdsFrom(repotag: string): Promise<string[]> {
    const { stdoutStr: rawHistoryIds } = await this.exec(`docker history -q`, [repotag], { silent: true })
    const historyIds = rawHistoryIds.split(`\n`).filter(id => id !== `<missing>` && id !== ``)
    return historyIds
  }

  private async getManifests() {
    return loadManifests(this.getUnpackedTarDir())
  }

  private async storeRoot() {
    const rootKey = await this.generateRootSaveKey()
    const paths = [
      this.getUnpackedTarDir(),
    ]
    core.info(`Start storing root cache, key: ${rootKey}, dir: ${paths}`)
    const cacheId = await LayerCache.dismissError(cache.saveCache(paths, rootKey), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1)
    core.info(`Stored root cache, key: ${rootKey}, id: ${cacheId}`)
    return cacheId !== -1 ? cacheId : undefined
  }

  private async separateAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getUnpackedTarDir(), this.getLayerCachesDir())
  }

  private async joinAllLayerCaches() {
    await this.moveLayerTarsInDir(this.getLayerCachesDir(), this.getUnpackedTarDir())
  }

  private async moveLayerTarsInDir(fromDir: string, toDir: string) {
    const layerTars = (await recursiveReaddir(fromDir))
      .filter(path => path.endsWith(`/layer.tar`))
      .map(path => path.replace(`${fromDir}/`, ``))

    const moveLayer = async (layer: string) => {
      const from = path.resolve(`${fromDir}/${layer}`)
      const to = path.resolve(`${toDir}/${layer}`)
      core.debug(`Moving layer tar from ${from} to ${to}`)
      await fs.mkdir(`${path.dirname(to)}`, { recursive: true })
      await fs.rename(from, to)
    }
    await Promise.all(layerTars.map(moveLayer))
  }

  private async storeLayers(): Promise<number[]> {
    const pool = new PromisePool(this.concurrency)

    const result =  Promise.all(
      (await this.getLayerIds()).map(
        layerId => {
          return pool.open(() => this.storeSingleLayerBy(layerId))
        }
      )
    )
    return result
  }

  static async dismissError<T>(promise: Promise<T>, dismissStr: string, defaultResult: T): Promise<T> {
    try {
      return await promise
    } catch (e) {
      core.debug(`catch error: ${e.toString()}`)
      if (typeof e.message !== 'string' || !e.message.includes(dismissStr)) {
        core.error(`Unexpected error: ${e.toString()}`)
        throw e
      }

      core.info(`${dismissStr}: ${e.toString()}`)
      core.debug(e)
      return defaultResult
    }
  }

  private async storeSingleLayerBy(layerId: string): Promise<number> {
    const path = this.genSingleLayerStorePath(layerId)
    const key = await this.generateSingleLayerSaveKey(layerId)

    core.info(`Start storing layer cache: ${JSON.stringify({ layerId, key })}`)
    const cacheId = await LayerCache.dismissError(cache.saveCache([path], key), LayerCache.ERROR_CACHE_ALREAD_EXISTS_STR, -1)
    core.info(`Stored layer cache: ${JSON.stringify({ key, cacheId })}`)

    core.debug(JSON.stringify({ log: `storeSingleLayerBy`, layerId, path, key, cacheId}))
    return cacheId
  }

  // ---

  async restore(primaryKey: string, restoreKeys?: string[]) {
    const restoredCacheKey = await this.restoreRoot(primaryKey, restoreKeys)
    if (restoredCacheKey === undefined) {
      core.info(`Root cache could not be found. aborting.`)
      return undefined
    }
    if (this.enabledParallel) {
      const hasRestoredAllLayers = await this.restoreLayers()
      if (!hasRestoredAllLayers) {
        core.info(`Some layer cache could not be found. aborting.`)
        return undefined
      }
      await this.joinAllLayerCaches()
    }
    await this.loadImageFromUnpacked()
    return restoredCacheKey
  }

  private async restoreRoot(primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> {
    core.debug(`Trying to restore root cache: ${ JSON.stringify({ restoreKeys, dir: this.getUnpackedTarDir() }) }`)
    const restoredRootKey = await cache.restoreCache([this.getUnpackedTarDir()], primaryKey, restoreKeys)
    core.debug(`restoredRootKey: ${restoredRootKey}`)
    if (restoredRootKey === undefined) {
      return undefined
    }
    this.restoredRootKey = restoredRootKey

    return restoredRootKey
  }

  private async restoreLayers(): Promise<boolean> {

    
    const pool = new PromisePool(this.concurrency)
    const tasks = (await this.getLayerIds()).map(
      layerId => pool.open(() => this.restoreSingleLayerBy(layerId))
    )

    try {
      await Promise.all(tasks)
    } catch (e) {
      if (typeof e.message === `string` && e.message.includes(LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR)) {
        core.info(e.message)

        // Avoid UnhandledPromiseRejectionWarning
        tasks.map(task => task.catch(core.info))

        return false
      }
      throw e
    }

    return true
  }

  private async restoreSingleLayerBy(id: string): Promise<string> {
    const path = this.genSingleLayerStorePath(id)
    const key = await this.recoverSingleLayerKey(id)
    const dir = path.replace(/[^/\\]+$/, ``)

    core.debug(JSON.stringify({ log: `restoreSingleLayerBy`, id, path, dir, key }))

    await fs.mkdir(dir, { recursive: true })
    const result = await cache.restoreCache([path], key)

    if (result == null) {
      throw new Error(`${LayerCache.ERROR_LAYER_CACHE_NOT_FOUND_STR}: ${JSON.stringify({ id })}`)
    }

    return result
  }

  private async loadImageFromUnpacked() {
    await exec.exec(`sh -c`, [`tar cf - . | docker load`], { cwd: this.getUnpackedTarDir() })
  }

  async cleanUp() {
    await fs.rmdir(this.getImagesDir(), { recursive: true })
  }

  // ---

  getImagesDir(): string {
    return this.imagesDir
  }

  getUnpackedTarDir(): string {
    return path.resolve(`${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`)
  }

  getLayerCachesDir() {
    return `${this.getUnpackedTarDir()}-layers`
  }

  getSavedImageTarDir(): string {
    return path.resolve(`${this.getImagesDir()}/${this.getCurrentTarStoreDir()}`)
  }

  getCurrentTarStoreDir(): string {
    return 'image'
  }

  genSingleLayerStorePath(id: string) {
    return path.resolve(`${this.getLayerCachesDir()}/${id}/layer.tar`)
  }

  async generateRootHashFromManifest(): Promise<string> {
    const manifest = await loadRawManifests(this.getUnpackedTarDir())
    return crypto.createHash(`sha256`).update(manifest, `utf8`).digest(`hex`)
  }

  async generateRootSaveKey(): Promise<string> {
    const rootHash = await this.generateRootHashFromManifest()
    const formatted = await this.getFormattedSaveKey(rootHash)
    core.debug(JSON.stringify({ log: `generateRootSaveKey`, rootHash, formatted }))
    return `${formatted}-root`
  }

  async generateSingleLayerSaveKey(id: string) {
    const formatted = await this.getFormattedSaveKey(id)
    core.debug(JSON.stringify({ log: `generateSingleLayerSaveKey`, formatted, id }))
    return `layer-${formatted}`
  }
  
  async recoverSingleLayerKey(id: string) {
    const unformatted = await this.recoverUnformattedSaveKey()
    return format(`layer-${unformatted}`, { hash: id })
  }

  async getFormattedSaveKey(hash: string) {
    const result = format(this.unformattedSaveKey, { hash })
    core.debug(JSON.stringify({ log: `getFormattedSaveKey`, hash, result }))
    return result
  }

  async recoverUnformattedSaveKey() {
    const hash = await this.generateRootHashFromManifest()
    core.debug(JSON.stringify({ log: `recoverUnformattedSaveKey`, hash}))

    return this.restoredRootKey.replace(hash, `{hash}`).replace(/-root$/, ``)
  }

  async getLayerTarFiles(): Promise<string[]> {
    const getTarFilesFromManifest = (manifest: Manifest) => manifest.Layers

    const tarFilesThatMayDuplicate = (await this.getManifests()).flatMap(getTarFilesFromManifest)
    const tarFiles = [...new Set(tarFilesThatMayDuplicate)]
    return tarFiles
  }

  async getLayerIds(): Promise<string[]> {
    const getIdfromLayerRelativePath = (path: string) => path.replace('/layer.tar', '')
    const layerIds = (await this.getLayerTarFiles()).map(getIdfromLayerRelativePath);
    core.debug(JSON.stringify({ log: `getLayerIds`, layerIds }))
    return layerIds
  }
}

export { LayerCache }
