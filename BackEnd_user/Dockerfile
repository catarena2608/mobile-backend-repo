FROM node:18-alpine3.16

WORKDIR /app/BackEnd_user

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]