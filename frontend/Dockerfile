# ---- Build stage ----
FROM node:24 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production stage: servido con nginx ----
FROM nginx:alpine AS production
COPY --from=builder /app/www /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Destino del proxy /api/. El valor por defecto sirve para docker-compose; en
# otros ambientes (ej. Render) se sobreescribe con la variable de entorno.
ENV BACKEND_URL=http://backend:3000
# Limita envsubst a BACKEND_URL para no tocar las variables de nginx.
ENV NGINX_ENVSUBST_FILTER=^BACKEND_URL$

EXPOSE 80
