FROM node:18-slim

WORKDIR /app/BackEnd_post

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4001

CMD ["node", "server.js"]