import * as exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set([])

  GET_ID_COMMAND_AND_ARGS = [`docker`, `image`, `ls`, `-q`]
  GET_REPOTAGS_COMMAND_AND_ARGS = [`docker`, `image`, `ls`, `--format`, `'{{ .Repository }}:{{ .Tag }}'`, `--filter`, `'dangling=false'`]
  GET_DIGEST_FROM_ID_COMMAND_AND_ARGS = [`docker`, `inspect`, `--format='{{index .RepoDigests 0}}'`]

  registerAlreadyExistedImages(images: string[]) {
    images.forEach(image => this.alreadyExistedImages.add(image))
  }

  async getExistingImages(): Promise<string[]> {
    const isNotEmptyStr = (str: string) => str !== ``
    const notIncludesNone = (str: string) => str.includes('<none>')
    const localExec = async (commandAndArgs: string[]): Promise<string[]> => {
      const [command, ...args] = commandAndArgs
      return (await exec.exec(command, args, { silent: true, listeners: { stderr: (data) => console.warn(`${command} ${args?.join(' ')}: ${data.toString()}`) }})).stdoutStr.split(`\n`).filter((s) => isNotEmptyStr(s) && !notIncludesNone(s))
    }

    const [ids, repotags] = await Promise.all(
      [this.GET_ID_COMMAND_AND_ARGS, this.GET_REPOTAGS_COMMAND_AND_ARGS].map((command) => localExec(command))
    )

    const digests = (await Promise.all(
      ids.map(
        async (id) => {
          const result = (await localExec([...this.GET_DIGEST_FROM_ID_COMMAND_AND_ARGS, id]))[0]
          return result != null ? [result] : []
        }
      )
    )).flat()

    core.debug(JSON.stringify({ log: `getExistingImages`, ids, repotags, digests }));

    return Array.from(new Set([...ids, ...repotags, ...digests]))
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
