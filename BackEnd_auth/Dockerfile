FROM node:18-slim

WORKDIR /app/BackEnd_auth

COPY package*.json ./

RUN npm install

COPY . .
# Comment added to force cache bust
EXPOSE 3001

CMD ["node", "server.js"]