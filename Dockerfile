FROM node:latest

RUN npm install -g @sern/cli typescript@latest

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . .

RUN sern build

RUN npx prisma generate

RUN npx prisma db push

CMD node dist/index.js
