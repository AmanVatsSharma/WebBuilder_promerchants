FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

WORKDIR /app/apps/storefront
RUN npx next build --webpack

ENV NODE_ENV=production
ENV PORT=4201

EXPOSE 4201

CMD ["npx", "next", "start", "-p", "4201"]
