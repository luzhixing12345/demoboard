FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=9527

EXPOSE 9527

CMD ["npm", "start"]
