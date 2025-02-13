FROM node:latest

RUN npm install -g @sern/cli typescript@latest yarn@latest

WORKDIR /app

COPY package.json ./

RUN yarn install

COPY . .

RUN sern build

CMD node dist/index.js
