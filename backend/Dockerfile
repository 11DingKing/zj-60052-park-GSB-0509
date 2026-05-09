FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ openssl openssl-dev

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com && npm install

COPY . .

ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
