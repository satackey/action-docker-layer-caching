# action-docker-layer-caching [![README sample test](https://github.com/satackey/action-docker-layer-caching/workflows/README%20sample%20test/badge.svg?event=push)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22README+sample+test%22) [![Release & Test](https://github.com/satackey/action-docker-layer-caching/workflows/Release%20&%20Test/badge.svg)](https://github.com/satackey/action-docker-layer-caching/actions?query=workflow%3A%22Release+%26+Test%22)

```yaml
name: CI

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        repotag: test_project_node
        key: docker-compose-node-image-${{ hashFiles('yarn.lock') }}

    - run: docker-compose -f test_project/docker-compose.yml -p test_project build
```
