# ---- Build stage: compila TypeScript e instala dependencias nativas (bcrypt) ----
FROM node:24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Dependencies stage: solo dependencias de produccion ----
FROM node:24 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Final stage: imagen liviana para produccion ----
FROM node:24-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# El contenedor solo ejecuta "node dist/main": npm/npx/corepack no se usan en
# tiempo de ejecucion. Se eliminan para reducir superficie de ataque y evitar
# arrastrar vulnerabilidades de las dependencias internas de npm.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

EXPOSE 3000

CMD ["node", "dist/main"]
