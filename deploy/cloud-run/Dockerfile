# Serves the generated status site on Cloud Run (the manual release:cloud-run job copies ./public next to this file).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY public /usr/share/nginx/html
EXPOSE 8080
