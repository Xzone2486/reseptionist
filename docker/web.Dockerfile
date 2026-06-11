FROM node:24-alpine
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm install
RUN npm run build --workspace @receptionist/web
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@receptionist/web"]

