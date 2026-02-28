FROM nginx:alpine

# Remove default Nginx configs that auto-generate
RUN rm -f /etc/nginx/conf.d/default.conf \
    && rm -rf /docker-entrypoint.d

# Copy custom configs
COPY default.conf /etc/nginx/conf.d/default.conf
COPY ssl-params.conf /etc/nginx/ssl-params.conf
COPY maintenance.html /usr/share/nginx/html/maintenance.html

EXPOSE 80 443

ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
