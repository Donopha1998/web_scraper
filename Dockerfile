FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

RUN npx playwright install --with-deps

COPY . .

RUN npx tsc

EXPOSE 3000

CMD ["node", "dist/index.js"]