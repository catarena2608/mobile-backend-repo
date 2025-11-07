FROM node:18-alpine3.16

WORKDIR /app/BackEnd_post

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 4001

CMD ["node", "server.js"]