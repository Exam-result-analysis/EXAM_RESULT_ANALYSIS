FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 5000

ENV PORT=5000 \
    NODE_ENV=production

CMD ["npm", "start"]
