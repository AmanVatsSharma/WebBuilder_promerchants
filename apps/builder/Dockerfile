FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

WORKDIR /app/apps/builder
RUN npx next build --webpack

ENV NODE_ENV=production
ENV PORT=4200

EXPOSE 4200

CMD ["npx", "next", "start", "-p", "4200"]
