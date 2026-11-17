FROM node:24.22.1-alpine AS frontend

ARG NEXT_PUBLIC_VERSION="0.0.0"
RUN echo "${NEXT_PUBLIC_VERSION}"
WORKDIR /frontend

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/.nvmrc ./

ENV COREPACK_INTEGRITY_KEYS=0
RUN corepack enable pnpm
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY frontend ./
RUN CI=true pnpm build

FROM nginxinc/nginx-unprivileged:1.27 as common

COPY --from=frontend /frontend/out /var/www/alma-frontend
COPY --from=frontend /frontend/next-routes.conf /srv/alma/
COPY docker/nginx/dummy.conf /etc/nginx/allow_ips.conf
COPY docker/nginx/review.htpasswd /etc/nginx/review.htpasswd
COPY docker/nginx/basic_auth.conf /etc/nginx/interlis_exports.conf
COPY docker/nginx/basic_auth.conf /etc/nginx/report_exports.conf
COPY docker/nginx/basic_auth.conf /etc/nginx/kbs_mapserver.conf
COPY docker/nginx/locations.conf.template /etc/nginx/templates/locations.conf.template

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

# Make filesystem permissions compatible with arbitrary UIDs (OpenShift style).
USER root
RUN chgrp -R 0 /var/cache/nginx /var/log/nginx \
&& chmod -R g+rwX /var/cache/nginx /var/log/nginx \
&& chgrp 0 /etc/nginx \
&& chmod g+rwX /etc/nginx
USER 101

CMD ["nginx", "-g", "daemon off;"]

FROM common as final-tls
ENV UPSTREAM_PROTOCOL=https
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf

FROM common as final-no-tls
ENV UPSTREAM_PROTOCOL=http
COPY docker/nginx/prod-no-tls.conf /etc/nginx/conf.d/default.conf
