# action-docker-layer-caching [![Readme Test](https://github.com/satackey/action-docker-layer-caching/workflows/Readme%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Readme+Test%22) [![CI](https://github.com/satackey/action-docker-layer-caching/workflows/CI/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3ACI)

With only one additional line, you can enable Docker layer caching.

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

    # Avoid caching pull-only images.(docker pull is faster than caching.)
    - run: docker-compose pull

    # Images created after this action is called are cached.
    - uses: satackey/action-docker-layer-caching@v0.0
    - run: docker-compose build
```

---

By default, the cache is separated by the name of the workflow.
You can configure manually cache keys.

```yaml
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        key: foo-docker-cache-{hash}
        restore-keys: |
          foo-docker-cache-
```

**Note: You must include `{hash}` in the `key` input.** (`{hash}` will be replaced with the hash value of the docker image).
