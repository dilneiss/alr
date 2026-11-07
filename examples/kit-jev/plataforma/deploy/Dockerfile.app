FROM node:22-alpine
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data JEV_GATEWAY_URL=http://gateway:8787
WORKDIR /srv
COPY shared ./shared
ARG APP
COPY apps/${APP} ./apps/${APP}
RUN rm -rf ./apps/${APP}/test ./apps/${APP}/data-runtime ./apps/${APP}/node_modules && mkdir -p /data
WORKDIR /srv/apps/${APP}
RUN if [ -f package.json ]; then npm install --omit=dev --no-audit --no-fund; fi
EXPOSE 3000
CMD ["node", "server.mjs"]
