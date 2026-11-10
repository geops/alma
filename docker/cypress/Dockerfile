FROM cypress/browsers:node-24.22.1-chrome-156.0.8078.47-1-ff-158.0.1-edge-155.0.4283.62-1

WORKDIR /frontend

COPY --chown=node:node frontend ./

ENV CYPRESS_BASE_URL=http://nginx
ENV COREPACK_INTEGRITY_KEYS=0

# Requires root privileges
RUN corepack enable pnpm
RUN chown -R node:node /frontend

USER node
RUN pnpm install
