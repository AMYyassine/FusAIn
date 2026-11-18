FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci && npm --prefix server ci

COPY src ./src
COPY views ./views
COPY public ./public
COPY server ./server
COPY vite.config.mjs ./

EXPOSE 3000 5173

CMD ["npx", "concurrently", "-k", \
    "npx vite --host 0.0.0.0 --port 5173 --strictPort", \
    "node server/server.js"]