import * as exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  async getExistingImages(): Promise<string[]> {
    const existingSet = new Set<string>([])
    const ids = (await exec.exec(`docker image ls -q`, [], {
      listeners: { stderr: data => console.warn(`docker image ls -q: ${data.toString()}`) }})
    ).stdoutStr.split(`\n`).filter(id => id !== ``)

    const repotagCommand = `docker`
    const repotagArguments = `image ls --format {{.Repository}}:{{.Tag}} --filter dangling=false`.split(' ')
    const repotags = (
      await exec.exec(
        repotagCommand,
        repotagArguments,
        {
          listeners: {
            stderr: data => console.warn(`${repotagCommand} ${repotagArguments.join(` `)}: ${data.toString()}`)
          }
        }
      )
    ).stdoutStr.split(`\n`).filter(
      repotag => repotag !== `` || !repotag.endsWith(`:<none>`)
    )

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
