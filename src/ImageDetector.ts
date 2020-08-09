import exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set([])
  existingImages: Set<string> = new Set([])

  GET_ID_COMMAND = `docker image ls -q`
  GET_REPOTAGS_COMMAND = `sh -c "docker images --format '{{ .Repository }}:{{ .Tag }}' --filter 'dangling=false' | grep -v '<none>'"`
  GET_DIGESTS_COMMAND = `docker images --format='{{ .Repository }}@{{ .ID }}' --no-trunc`

  registerAlreadyExistedImages(images: string[]) {
    images.forEach(image => this.alreadyExistedImages.add(image))
  }
  async getExistingImages(): Promise<string[]> {
    const isEmptyStr = (str: string) => str !== ``

    const [ids, repotags, digests] = await Promise.all(
      [this.GET_ID_COMMAND, this.GET_REPOTAGS_COMMAND, this.GET_DIGESTS_COMMAND].map(async command =>
        (await exec.exec(command, [], { silent: true })).stdoutStr.split(`\n`).filter(isEmptyStr)
      )
    )

    core.debug(JSON.stringify({ log: `getExistingImages`, ids, repotags, digests }));
    ([...ids, ...repotags, ...digests]).forEach(image => this.existingImages.add(image))

    return Array.from(this.existingImages)
  }

  getImagesShouldSave(): string[] {
    const resultSet = new Set(this.existingImages.values())
    this.alreadyExistedImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }
}
