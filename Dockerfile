FROM node:24-alpine

WORKDIR /app
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

COPY . .
ARG VITE_API_URL=https://iinfo-dx-api.forestlee.me
ENV VITE_API_URL=$VITE_API_URL
RUN yarn build

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
EXPOSE 3000
CMD ["yarn", "start"]
