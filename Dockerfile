FROM node:22-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 PORT=4174 NODE_ENV=production
EXPOSE 4174
CMD ["node", "server.mjs"]
