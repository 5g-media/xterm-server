FROM node:alpine

ADD . /app
WORKDIR /app

RUN apk update
RUN apk --no-cache add g++ gcc libgcc libstdc++ linux-headers make python bash
RUN npm install

RUN mkdir -p ~/tutorials/osm ~/tutorials/leanow

EXPOSE 7000

ENTRYPOINT [ "node" ]
CMD ["app.js"]