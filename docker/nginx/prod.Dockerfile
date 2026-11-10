FROM node:22.23.4-alpine AS frontend

ARG NEXT_PUBLIC_VERSION="0.0.0"
RUN echo "${NEXT_PUBLIC_VERSION}"
WORKDIR /frontend

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/.nvmrc ./

ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable pnpm
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY frontend ./
RUN CI=true pnpm build

FROM nginx:1.27

COPY --from=frontend /frontend/out /var/www/alma-frontend
COPY --from=frontend /frontend/next-routes.conf /srv/alma/
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/dummy.conf /etc/nginx/allow_ips.conf
COPY docker/nginx/review.htpasswd /etc/nginx/review.htpasswd
COPY docker/nginx/basic_auth.conf /etc/nginx/interlis_exports.conf
COPY docker/nginx/basic_auth.conf /etc/nginx/report_exports.conf
COPY docker/nginx/basic_auth.conf /etc/nginx/kbs_mapserver.conf

CMD ["nginx", "-g", "daemon off;"]
