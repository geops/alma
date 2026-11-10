FROM camptocamp/mapserver:8.2

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

# Make filesystem permissions compatible with arbitrary UIDs (OpenShift style).
RUN chgrp -R 0 /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start \
    && chmod -R g=u /etc/mapserver /etc/mapserver.conf /usr/local/bin/replace-variables-and-start

USER 1001

EXPOSE 8081/tcp

CMD ["/usr/local/bin/replace-variables-and-start"]
