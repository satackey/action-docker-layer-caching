# action-docker-layer-caching ![README sample test](https://github.com/satackey/action-docker-layer-caching/workflows/README%20sample%20test/badge.svg?event=push) ![Relase & Test](https://github.com/satackey/action-docker-layer-caching/workflows/Relase%20&%20Test/badge.svg)

```yaml
name: CI

on: push

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: satackey/action-docker-layer-caching@v0.0
      with:
        repotag: amazon/aws-cli
        key: aws-cli-docker-image

    - run: docker pull amazon/aws-cli
    - run: docker run --rm amazon/aws-cli --version
```
