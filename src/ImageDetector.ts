import * as exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  async getExistingImages(): Promise<string[]> {
    const existingSet = new Set<string>([])
    const ids = (await exec.exec(`docker image ls -q`, [], { silent: true, listeners: { stderr: console.warn }})).stdoutStr.split(`\n`).filter(id => id !== ``)
    const repotags = (await exec.exec(`docker`, `image ls --format {{.Repository}}:{{.Tag}} --filter dangling=false`.split(' '), { silent: true, listeners: { stderr: console.warn }})).stdoutStr.split(`\n`).filter(id => id !== ``);
    core.debug(JSON.stringify({ log: "getExistingImages", ids, repotags }));
    ([...ids, ...repotags]).forEach(image => existingSet.add(image))
    core.debug(JSON.stringify({ existingSet }))
    return Array.from(existingSet)
  }

  async getImagesShouldSave(alreadRegisteredImages: string[]): Promise<string[]> {
    const resultSet = new Set(await this.getExistingImages())
    alreadRegisteredImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }
}
