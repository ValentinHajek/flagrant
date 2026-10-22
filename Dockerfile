# Image de prod : le site (build Vite) et l'API, servis par scripts/server.mjs.
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10.13.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Les tests conditionnent le déploiement : s'ils échouent, pas d'image, l'ancienne version reste en ligne.
RUN pnpm test
# Site et API à la même adresse : l'API est sur /api.
ENV VITE_API_URL=/api
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080 STATIC_DIR=dist
RUN npm install -g pnpm@10.13.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && npm uninstall -g pnpm
COPY --from=build /app/dist ./dist
COPY api ./api
COPY src/quiz.js ./src/quiz.js
COPY scripts/server.mjs ./scripts/server.mjs
USER node
EXPOSE 8080
CMD ["node", "scripts/server.mjs"]
