FROM node:20-alpine

WORKDIR /app

COPY novawin-front/package.json novawin-front/package-lock.json* ./
RUN npm install

EXPOSE 3000

CMD ["npm", "run", "dev"]