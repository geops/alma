FROM nginx:1.27

COPY docker/nginx/dev.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/mapserver.htpasswd /etc/nginx/mapserver.htpasswd

CMD ["nginx", "-g", "daemon off;"]
COPY docker/nginx/dev.conf /etc/nginx/conf.d/default.conf
