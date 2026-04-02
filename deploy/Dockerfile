FROM --platform=$BUILDPLATFORM docker.m.daocloud.io/library/node:24 AS front
WORKDIR /web-admin

# Copy only dependency files first for better caching
COPY ./web-admin/package.json ./web-admin/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 1000000 \
    && yarn cache clean

# Copy source files and build
COPY ./web-admin .
RUN NODE_OPTIONS="--max-old-space-size=4096" yarn run build

FROM --platform=$BUILDPLATFORM docker.m.daocloud.io/library/golang:1.26.1 AS back
WORKDIR /go/src/casdoor/admin
ENV GOPROXY=https://goproxy.cn,direct

# Copy only go.mod and go.sum first for dependency caching
COPY ./admin/go.mod ./admin/go.sum ./
RUN go mod download

# Copy source files
COPY ./.git /go/src/casdoor/.git
COPY ./admin .

RUN go test -v -run TestGetVersionInfo ./util/system_test.go ./util/system.go ./util/variable.go ./util/path.go \
    && ./build.sh

FROM docker.m.daocloud.io/library/alpine:latest AS standard
LABEL MAINTAINER="https://casdoor.org/"
ARG USER=casdoor
ARG TARGETOS
ARG TARGETARCH
ENV BUILDX_ARCH="${TARGETOS:-linux}_${TARGETARCH:-amd64}"

RUN adduser -D $USER -u 1000 \
    && sed -i 's/https/http/' /etc/apk/repositories \
    && apk add --no-cache tzdata ca-certificates \
    && update-ca-certificates \
    && mkdir logs \
    && chown -R $USER:$USER logs

USER 1000
WORKDIR /
COPY --from=back --chown=$USER:$USER /go/src/casdoor/admin/server_${BUILDX_ARCH} ./server
COPY --from=back --chown=$USER:$USER /go/src/casdoor/admin/swagger ./swagger
COPY ./deploy/app.conf ./conf/app.conf
COPY --from=front --chown=$USER:$USER /web-admin/build ./web/build

ENTRYPOINT ["/server"]


FROM docker.m.daocloud.io/library/debian:bookworm-slim AS allinone
LABEL MAINTAINER="https://casdoor.org/"
ARG TARGETOS
ARG TARGETARCH
ENV BUILDX_ARCH="${TARGETOS:-linux}_${TARGETARCH:-amd64}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates lsof \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /
COPY --from=back /go/src/casdoor/admin/server_${BUILDX_ARCH} ./server
COPY --from=back /go/src/casdoor/admin/swagger ./swagger
COPY --from=back /go/src/casdoor/admin/docker-entrypoint.sh /docker-entrypoint.sh
COPY ./deploy/app.conf ./conf/app.conf
COPY --from=front /web-admin/build ./web/build

ENTRYPOINT ["/bin/bash"]
CMD ["/docker-entrypoint.sh"]
