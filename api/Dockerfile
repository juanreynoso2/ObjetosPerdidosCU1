# Se construye desde la raíz del repositorio (ver docker-compose.yml)
FROM node:22-alpine

ENV TZ=America/Mexico_City
ENV FRONTEND_DIR=/app/public
RUN apk add --no-cache tzdata

WORKDIR /app
COPY api/package.json api/package-lock.json ./
RUN npm ci && npm cache clean --force

COPY api/src ./src
COPY api/test ./test
COPY frontend ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/salud || exit 1

CMD ["npm", "start"]
