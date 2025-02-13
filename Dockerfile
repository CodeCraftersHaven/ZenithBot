FROM node:latest

RUN npm install -g @sern/cli typescript@latest

WORKDIR /zenith

COPY *.json ./

RUN npm install

COPY src /zenith/src
COPY prisma /zenith/prisma

RUN sern build

RUN npx prisma generate

CMD ["node", "dist/index.js"]
