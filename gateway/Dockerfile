FROM node:18-slim

WORKDIR /app/BackEnd_user

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]