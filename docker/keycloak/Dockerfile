FROM quay.io/keycloak/keycloak:26.7.3 as builder

# Enable health and metrics support
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true

# Configure a database vendor
ENV KC_DB=postgres
COPY ./docker/keycloak/alma.jar /opt/keycloak/providers/alma.jar

WORKDIR /opt/keycloak
# ALTLAGA-10: no certificate/keystore is baked into the image.

FROM quay.io/keycloak/keycloak:26.7.3
COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY ./docker/keycloak/initial.json /opt/keycloak/data/import/initial.json
COPY ./docker/keycloak/password_blocklist.txt /opt/keycloak/data/password-blacklists/weak_passwords.txt
COPY ./docker/keycloak/import-for-review.sh /opt/keycloak/bin/import-for-review.sh

ENV KC_DB=postgres
ENV KC_DB_URL=jdbc:postgresql://db:5432/alma
ENV KC_DB_SCHEMA=keycloak
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true
ENV KC_HTTP_RELATIVE_PATH=/auth
ENV KC_BOOTSTRAP_ADMIN_USERNAME=admin

RUN /opt/keycloak/bin/kc.sh build

ENV KC_DB_USERNAME=alma
ENV KC_DB_PASSWORD=alma

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--db-schema=keycloak", "--proxy-headers", "xforwarded", "--proxy-trusted-addresses=10.0.0.0/8", "--spi-events-listener-jboss-logging-success-level=info", "--spi-events-listener-jboss-logging-error-level=error"]
