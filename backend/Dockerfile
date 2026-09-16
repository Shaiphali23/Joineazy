FROM node:22-alpine

WORKDIR /app

# Dependencies first, so edits to source don't invalidate the install layer.
COPY package*.json ./
RUN npm ci --omit=dev

# The Prisma client is generated against the schema at build time.
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 4000
# Migrations are applied at container start, so a fresh database is usable
# immediately after `docker compose up` with no manual step.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
