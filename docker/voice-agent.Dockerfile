FROM node:24-alpine
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY services/voice-agent services/voice-agent
RUN npm install
RUN npm run build --workspace @receptionist/voice-agent
CMD ["npm", "run", "start", "--workspace", "@receptionist/voice-agent"]

