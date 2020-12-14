# Docker Layer Caching in GitHub Actions [![Readme Test status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/Readme%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Readme+Test%22) [![CI status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/CI/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3ACI)

Enable Docker Layer Caching by adding a single line in GitHub Actions.
This GitHub Action speeds up the building of docker images in your GitHub Actions workflow.

You can run `docker build` and `docker-compose build` in your GitHub Actions workflow using the cache with no special configuration, and it also supports multi-stage builds.

This GitHub Action uses the [docker save](https://docs.docker.com/engine/reference/commandline/save/) / [docker load](https://docs.docker.com/engine/reference/commandline/load/) command and the [@actions/cache](https://www.npmjs.com/package/@actions/cache) library.

## ⚠️ **Deprecation Notice for `v0.0.4` and older** ⚠️

The author had not considered a large number of layers to be cached, so those versions process all layers in parallel.
([#12](https://github.com/satackey/action-docker-layer-caching/issues/12))  
**Please update to version `v0.0.5` with limited concurrency to avoid overloading the cache service.**

## Example workflows

### Docker Compose
```yaml
name: CI

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    # Pull the latest image to build, and avoid caching pull-only images.
    # (docker pull is faster than caching in most cases.)
    - run: docker-compose pull

    # In this step, this action saves a list of existing images,
    # the cache is created without them in the post run.
    # It also restores the cache if it exists.
    - uses: satackey/action-docker-layer-caching@v0.0.11
      # Ignore the failure of a step and avoid terminating the job.
      continue-on-error: true

    - run: docker-compose up --build

    # Finally, "Post Run satackey/action-docker-layer-caching@v0.0.11",
    # which is the process of saving the cache, will be executed.
```


### docker build

```yaml
name: CI

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    # In this step, this action saves a list of existing images,
    # the cache is created without them in the post run.
    # It also restores the cache if it exists.
    - uses: satackey/action-docker-layer-caching@v0.0.11
      # Ignore the failure of a step and avoid terminating the job.
      continue-on-error: true

    - name: Build the Docker image
      run: docker build . --file Dockerfile --tag my-image-name:$(date +%s)

    # Finally, "Post Run satackey/action-docker-layer-caching@v0.0.11",
    # which is the process of saving the cache, will be executed.
```


## Inputs

See [action.yml](./action.yml) for details.

By default, the cache is separated by the workflow name.
You can also set the cache key manually, like the official [actions/cache](https://github.com/actions/cache#usage) action.

```yaml
    - uses: satackey/action-docker-layer-caching@v0.0.11
      # Ignore the failure of a step and avoid terminating the job.
      continue-on-error: true
      with:
        key: foo-docker-cache-{hash}
        restore-keys: |
          foo-docker-cache-
```

**Note: You must include `{hash}` in the `key` input.** (`{hash}` is replaced by the hash value of the docker image when the action is executed.)
