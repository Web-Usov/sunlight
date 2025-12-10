FROM node:22-alpine AS builder

ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /workspace

RUN npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY turbo.json ./
COPY tsconfig.json ./

COPY packages ./packages/
COPY apps/client/package.json ./apps/client/

RUN pnpm install --frozen-lockfile

COPY .env.prod ./.env

COPY apps/client ./apps/client/

WORKDIR /workspace/apps/client
RUN pnpm build --mode prod


FROM nginx:alpine

ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="Sunlight - Frontend" \
      org.opencontainers.image.description="React Frontend for Sunlight" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.authors="webusov" \
      org.opencontainers.image.vendor="webusov" \
      maintainer="webusov"

ENV APP_VERSION=${VERSION}

COPY --from=builder /workspace/apps/client/dist /usr/share/nginx/html

COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


