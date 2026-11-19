FROM node:22-alpine

ENV TZ=America/Mexico_City
RUN apk add --no-cache tzdata

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY src ./src
COPY test ./test

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/salud || exit 1

CMD ["npm", "start"]
