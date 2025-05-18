FROM node:18-alpine

WORKDIR /app
RUN chown node:node /app
USER node

COPY package.json ./
RUN npm install && npm cache clean --force

COPY ./src ./src
COPY index.html ./
COPY vite.config.js ./

EXPOSE 5137

CMD ["npm", "run", "dev"]