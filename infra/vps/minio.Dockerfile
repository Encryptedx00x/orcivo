# MinIO community edition no longer ships container images (Docker Hub / Quay
# images were withdrawn), so build the official server from the tagged source.
FROM golang:1.24-alpine AS build
ARG MINIO_RELEASE=RELEASE.2025-10-15T17-29-55Z
RUN apk add --no-cache git
RUN git clone --depth 1 --branch ${MINIO_RELEASE} https://github.com/minio/minio.git /src
WORKDIR /src
RUN CGO_ENABLED=0 GOTOOLCHAIN=auto go build -trimpath -ldflags "-s -w" -o /minio .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /minio /usr/bin/minio
EXPOSE 9000
ENTRYPOINT ["/usr/bin/minio"]
