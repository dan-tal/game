FROM nginx:alpine

# dist/ e produs de tools/build.js (deploy.sh il ruleaza inainte de `docker build`): pachete cu hash in nume
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
