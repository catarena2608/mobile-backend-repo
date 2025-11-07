FROM node:18-alpine3.16

WORKDIR /app/BackEnd_auth

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]