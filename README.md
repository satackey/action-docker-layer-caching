# action-docker-layer-caching [![Readme Test status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/Readme%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Readme+Test%22) [![CI status is unavailable](https://github.com/satackey/action-docker-layer-caching/workflows/CI/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3ACI)

Enable Docker Layer Caching by adding only one line.

You can use `docker build` and `docker-compose build` with the cache without any special configuration,
and there is also support for multi-stage builds.

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

---

By default, the cache is separated by the workflow name.
You can configure manually cache keys.

```yaml
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        key: foo-docker-cache-{hash}
        restore-keys: |
          foo-docker-cache-
```

**Note: You must include `{hash}` in the `key` input.** (`{hash}` will be replaced with the hash value of the docker image).
