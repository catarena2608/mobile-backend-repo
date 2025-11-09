FROM node:18-slim

WORKDIR /app/BackEnd_post

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]