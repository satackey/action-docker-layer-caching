import exec from 'actions-exec-listener'
import * as core from '@actions/core'

export class ImageDetector {
  alreadyExistedImages: Set<string> = new Set([])
  existingImages: Set<string> = new Set([])
  registerAlreadyExistedImages(images: string[]) {
    images.forEach(image => this.alreadyExistedImages.add(image))
  }

  async getExistingImages(): Promise<string[]> {
    const ids = (await exec.exec(`docker image ls -q`, [], { silent: true })).stdoutStr.split(`\n`).filter(id => id !== ``)
    const repotags = (await exec.exec(`sh -c "docker image ls --all --format '{{ .Repository }}:{{ .Tag }}'"`, [], { silent: false })).stdoutStr.split(`\n`).filter(id => id !== `` || !id.includes(`<node>`));
    ([...ids, ...repotags]).forEach(image => this.existingImages.add(image))
    core.debug(JSON.stringify({ existingImages: this.existingImages }))
    return Array.from(this.existingImages)
  }

  getImagesShouldSave(): string[] {
    const resultSet = new Set(this.existingImages.values())
    this.alreadyExistedImages.forEach(image => resultSet.delete(image))
    return Array.from(resultSet)
  }
}
