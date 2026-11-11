FROM camptocamp/mapserver:8.2 AS common

USER root
# copied from https://github.com/camptocamp/docker-mapserver/blob/master/runtime/usr/local/bin/start-server
# changed the ports to always use 8081.
# This was intiially located in the /usr/local/bin/replace-variables-and-start file, but moved to
# here, to allow non-root user execution
ENV IO_TIMEOUT=300
RUN sed -i \
        -e 's/<VirtualHost \*:8080>/<VirtualHost *:8081>/' \
        /etc/apache2/sites-available/000-default.conf \
    && sed -i 's/Listen 8080$/Listen 8081/' /etc/apache2/ports.conf

COPY ./docker/mapserver/*.map /etc/mapserver/
COPY ./docker/mapserver/mapserver.conf /etc/
COPY ./docker/mapserver/replace-variables-and-start /usr/local/bin/replace-variables-and-start

EXPOSE 8081/tcp

CMD ["/usr/local/bin/replace-variables-and-start"]


FROM common AS final-tls
# the default 443 listeners are removed, HTTPS is served on 8081
RUN a2enmod ssl \
    && sed -i '/<IfModule ssl_module>/,/<\/IfModule>/d; /<IfModule mod_gnutls.c>/,/<\/IfModule>/d' /etc/apache2/ports.conf \
    && sed -i 's|</VirtualHost>|\tInclude /etc/apache2/alma-tls.conf\n</VirtualHost>|' \
        /etc/apache2/sites-available/000-default.conf \
    && sed -i "s|\${MAPSERVER_POSTGRES_SSL}|sslmode='verify-full' sslrootcert='\${MAPSERVER_TLS_CA_FILE}'|g" /etc/mapserver/*.map
COPY ./docker/mapserver/alma-tls.conf /etc/apache2/alma-tls.conf
COPY ./docker/mapserver/tls-start /usr/local/bin/tls-start
# Make filesystem permissions compatible with arbitrary UIDs (OpenShift style).
RUN chgrp -R 0 /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start \
    && chmod -R g=u /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start
USER 1001
CMD ["/usr/local/bin/tls-start"]

FROM common AS final-no-tls
RUN sed -i "s|\${MAPSERVER_POSTGRES_SSL}||g" /etc/mapserver/*.map
# Make filesystem permissions compatible with arbitrary UIDs (OpenShift style).
RUN chgrp -R 0 /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start \
    && chmod -R g=u /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start
USER 1001
