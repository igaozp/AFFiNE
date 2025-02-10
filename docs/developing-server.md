This document explains how to start server (@affine/server) locally with Docker

> **Warning**:
>
> This document is not guaranteed to be up-to-date.
> If you find any outdated information, please feel free to open an issue or submit a PR.

## Run required dev services in docker compose

Running yarn's server package (@affine/server) requires some dev services to be running, i.e.:

- postgres
- redis
- mailhog

You can run these services in docker compose by running the following command:

```sh
cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env

docker compose -f ./.docker/dev/compose.yml up
```

## Build native packages (you need to setup rust toolchain first)

Server also requires native packages to be built, you can build them by running the following command:

```sh
# build native
yarn affine @affine/server-native build
```

## Prepare dev environment

```sh
# uncomment all env variables here
cp packages/backend/server/.env.example packages/backend/server/.env
yarn affine server prisma db push
yarn affine server data-migration run
```

## Start server

```sh
# at project root
yarn affine server dev
```

when server started, it will created a default user for testing:

- email: dev@affine.pro
- name: Dev User
- password: dev

## Start frontend

```sh
# at project root
yarn dev
```

You can login with the user (dev@affine.pro / dev) above to test the server.

## Done

Now you should be able to start developing affine with server enabled.

## Bonus

### Enable prisma studio (Database GUI)

```sh
# available at http://localhost:5555
yarn affine server prisma studio
```
