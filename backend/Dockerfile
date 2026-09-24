# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node migrations ./migrations

USER node

EXPOSE 3000

CMD ["node", "dist/server.js"]
