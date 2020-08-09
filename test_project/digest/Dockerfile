FROM node@sha256:d0738468dfc7cedb7d260369e0546fd7ee8731cfd67136f6023d070ad9679090 as curl-env
RUN set -x \
    apk update && \
    apk add curl && \
    mkdir -p /src && \
    curl -o /src/install.sh -L https://yarnpkg.com/install.sh && \
    chmod +x /src/install.sh && \
    apk del curl

FROM node@sha256:d0738468dfc7cedb7d260369e0546fd7ee8731cfd67136f6023d070ad9679090

COPY --from=curl-env /src/install.sh /tmp/install.sh
RUN set -x \
    apk update && \
    apk add curl && \
    /tmp/install.sh && \
    apk del curl

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# COPY . ./
