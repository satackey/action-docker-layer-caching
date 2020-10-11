import * as exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set([])
  existingImages: Set<string> = new Set([])

  GET_ID_COMMAND = `docker image ls -q`
  GET_REPOTAGS_COMMAND = `docker image ls --format '{{ .Repository }}:{{ .Tag }}' --filter 'dangling=false' | grep -v '<none>'`
  GET_DIGESTS_COMMAND = `docker image ls --format='{{ .Repository }}@{{ .ID }}' --no-trunc`

  registerAlreadyExistedImages(images: string[]) {
    images.forEach(image => this.alreadyExistedImages.add(image))
  }

  async getExistingImages(): Promise<string[]> {
    const isNotEmptyStr = (str: string) => str !== ``
    const endsWithNone = (str: string) => str.endsWith('<none>')

    const [ids, repotags, digests] = await Promise.all(
      [this.GET_ID_COMMAND, this.GET_REPOTAGS_COMMAND, this.GET_DIGESTS_COMMAND].map(async command =>
        (await exec.exec(`sh -c`, [command], { silent: true, listeners: { stderr: (data) => console.warn(`${command}: ${data.toString()}`) }})).stdoutStr.split(`\n`).filter((s) => isNotEmptyStr(s) && !endsWithNone(s))
      )
    )

    core.debug(JSON.stringify({ log: `getExistingImages`, ids, repotags, digests }));
    ([...ids, ...repotags, ...digests]).forEach(image => this.existingImages.add(image))

    return Array.from(this.existingImages)
  }

  async getImagesShouldSave(alreadRegisteredImages: string[]): Promise<string[]> {
    const resultSet = new Set(await this.getExistingImages())
    alreadRegisteredImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }

  async checkIfImageHasAdded(restoredImages: string[]): Promise<boolean> {
    const existing = await this.getExistingImages()
    return JSON.stringify(restoredImages) === JSON.stringify(existing)
  }
}
