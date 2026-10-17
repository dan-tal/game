FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js rooms.js limits.js ./
COPY games ./games

# procesul nu are nevoie de root
USER node

EXPOSE 8080
CMD ["node", "index.js"]
