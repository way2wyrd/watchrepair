# Stage 1: Build frontend
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server.js ./
COPY --from=build /app/dist ./dist

# Create directories for persistent data
RUN mkdir -p /app/data /app/data/movement-photos /app/uploads /app/manuals

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV UPLOADS_DIR=/app/uploads
ENV MANUALS_DIR=/app/manuals
ENV MOVEMENT_PHOTOS_DIR=/app/data/movement-photos

EXPOSE 3001

CMD ["node", "server.js"]
