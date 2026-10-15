# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
COPY data ./data
RUN npm run build

# Runtime stage
FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
EXPOSE 3000
CMD ["node", "dist/index.js"]
