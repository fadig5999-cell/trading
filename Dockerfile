# ---- Marble Inventory production image ----
FROM node:20-bookworm-slim

# Build tools for better-sqlite3 native module (falls back if no prebuilt binary)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Persistent data + uploads directories (mount volumes here in production)
RUN mkdir -p data uploads
VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000
CMD ["node", "server/index.js"]
