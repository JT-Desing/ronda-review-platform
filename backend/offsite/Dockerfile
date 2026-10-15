FROM postgres:17-alpine
RUN apk add --no-cache restic
COPY offsite-backup.sh offsite-verify.sh /usr/local/bin/
# Same uid as the API's "node" user: uploaded files are mode 0600.
USER 1000:1000
ENTRYPOINT ["sh", "/usr/local/bin/offsite-backup.sh"]
