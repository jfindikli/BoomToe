# Use official Node.js LTS image
FROM node:18-alpine

WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production
COPY . ./
EXPOSE 80
CMD ["node", "server.js"]
