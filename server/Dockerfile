FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js rooms.js ./
COPY games ./games

EXPOSE 8080
CMD ["node", "index.js"]
