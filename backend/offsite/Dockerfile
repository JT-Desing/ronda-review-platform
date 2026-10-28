FROM postgres:17-alpine
# gosu is the postgres entrypoint helper; this image has its own entrypoint.
RUN apk upgrade --no-cache && apk add --no-cache restic && rm -f /usr/local/bin/gosu
COPY offsite-backup.sh offsite-verify.sh /usr/local/bin/
# Same uid as the API's "node" user: uploaded files are mode 0600.
USER 1000:1000
ENTRYPOINT ["sh", "/usr/local/bin/offsite-backup.sh"]
