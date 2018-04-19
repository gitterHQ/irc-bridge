FROM node:4
ADD . /app
WORKDIR /app
RUN npm i
EXPOSE 4567 6667
CMD ["npm", "start"]
