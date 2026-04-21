FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY . .
RUN npm ci
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main"]
