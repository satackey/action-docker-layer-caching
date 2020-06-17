# action-docker-layer-caching [![Readme Test](https://github.com/satackey/action-docker-layer-caching/workflows/Readme%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Readme+Test%22) [![CI](https://github.com/satackey/action-docker-layer-caching/workflows/CI/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3ACI)

Enable docker layer caching by adding a single line.

```yaml
name: Readme Test

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - uses: satackey/action-docker-layer-caching@v0.0 # Images created after this action is called are cached.
    - run: docker-compose build
```
