FROM node:12.16.3-slim

# Install latest yarn
RUN wget --compressed -o- -L https://yarnpkg.com/install.sh
# Install node_modules from package.json and yarn.lock
WORKDIR /app
# COPY package.json yarn.lock ./
# RUN yarn install --frozen-lockfile
