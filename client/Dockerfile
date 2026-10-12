# Dev/CI image only: compose runs `npm run dev` here.
# The prod image (repo-root Dockerfile) builds client/dist itself, so no
# nginx stage — a plain `docker build ./client` must keep npm in the image.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
