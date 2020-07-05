# action-docker-layer-caching [![Readme Test status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/Readme%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Readme+Test%22) [![CI status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/CI/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3ACI)

Enable Docker Layer Caching by adding only one line.

You can use `docker build` and `docker-compose build` with the cache without any special configuration,
and there is also support for multi-stage builds.

This action uses the [docker save](https://docs.docker.com/engine/reference/commandline/save/) / [docker load](https://docs.docker.com/engine/reference/commandline/load/) command and the [@actions/cache](https://www.npmjs.com/package/@actions/cache) library.


## Example workflow

```yaml
name: Readme Test

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
    - uses: satackey/action-docker-layer-caching@v0.0

    - run: docker-compose build

    # Finally, "Post Run satackey/action-docker-layer-caching@v0.0",
    # which is the process of saving the cache, will be executed.
```


## Inputs

See [action.yml](./action.yml) for details

By default, the cache is separated by the workflow name.
You can also set the cache key manually, like the official [actions/cache](https://github.com/actions/cache#usage) action.

```yaml
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        key: foo-docker-cache-{hash}
        restore-keys: |
          foo-docker-cache-
```

**Note: You must include `{hash}` in the `key` input.** (`{hash}` is replaced by the hash value of the docker image when the action is executed.)
