FROM node:24-alpine
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm install
RUN npm run build --workspace @receptionist/api
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:deploy --workspace @receptionist/api || true && npm run seed --workspace @receptionist/api && npm run start --workspace @receptionist/api"]

