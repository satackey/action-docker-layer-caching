import exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set([])
  existingImages: Set<string> = new Set([])

  GET_ID_COMMAND = `docker image ls -q`
  GET_REPOTAGS_COMMAND = `sh -c "docker image ls --format '{{ .Repository }}:{{ .Tag }}' --filter 'dangling=false' | grep -v '<none>'"`
  GET_DIGESTS_COMMAND = `sh -c "docker image ls --format='{{ .Repository }}@{{ .ID }}' --no-trunc"`

  registerAlreadyExistedImages(images: string[]) {
    images.forEach(image => this.alreadyExistedImages.add(image))
  }

  async getExistingImages(): Promise<string[]> {
    const isEmptyStr = (str: string) => str !== ``

    const commands = [this.GET_ID_COMMAND, this.GET_REPOTAGS_COMMAND, this.GET_DIGESTS_COMMAND]
    const results = []
    for await (const command of commands) {
      const commandResult = (await exec.exec(command)).stdoutStr
      results.push(commandResult.split(`\n`).filter(isEmptyStr))
    }

    core.debug(JSON.stringify({ log: `getExistingImages`, results }));
    results.flat().forEach(image => this.existingImages.add(image))

    return Array.from(this.existingImages)
  }

  getImagesShouldSave(): string[] {
    const resultSet = new Set(this.existingImages.values())
    this.alreadyExistedImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }
}
