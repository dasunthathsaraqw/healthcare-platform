FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY .env ./.env

EXPOSE 5004

CMD ["npm", "start"]
