FROM node:latest

RUN npm install -g @sern/cli typescript@latest

WORKDIR /zenith

COPY *.json ./

RUN npm install

COPY src /zenith/src
COPY prisma /zenith/prisma
COPY assets /zenith/assets

RUN npx prisma generate
RUN npx prisma db push

RUN sern build

CMD ["node", "dist/index.js"]
