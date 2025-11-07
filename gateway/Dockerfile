FROM node:18-slim

WORKDIR /app/gateway

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]