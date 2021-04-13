import * as core from "@actions/core";
import { LayerCache } from "./src/LayerCache";
import { ImageDetector } from "./src/ImageDetector";

const main = async () => {
  const primaryKey = core.getInput(`key`, { required: true });
  const restoreKeys = core
    .getInput(`restore-keys`, { required: false })
    .split(`\n`)
    .filter((key) => key !== ``);

  const imageDetector = new ImageDetector();

  const container = core.getInput(`container`).toLowerCase();
  if (container !== "docker" && container !== "podman") {
    throw new Error("Wrong container name: " + container);
  }

  const alreadyExistingImages = await imageDetector.getExistingImages(
    container
  );
  core.saveState(
    `already-existing-images`,
    JSON.stringify(alreadyExistingImages)
  );

  const layerCache = new LayerCache([]);
  layerCache.concurrency = parseInt(
    core.getInput(`concurrency`, { required: true }),
    10
  );
  const restoredKey = await layerCache.restore(
    primaryKey,
    container,
    restoreKeys
  );
  await layerCache.cleanUp();

  core.saveState(
    `restored-key`,
    JSON.stringify(restoredKey !== undefined ? restoredKey : "")
  );
  core.saveState(
    `restored-images`,
    JSON.stringify(
      await imageDetector.getImagesShouldSave(alreadyExistingImages, container)
    )
  );
};

main().catch((e) => {
  console.error(e);
  core.setFailed(e);

  core.saveState(`restored-key`, JSON.stringify(``));
  core.saveState(`restored-images`, JSON.stringify([]));
});
