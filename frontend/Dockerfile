# usa o Nginx como servidor de arquivos estáticos
FROM nginx:alpine

# remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# copia os arquivos do frontend para a pasta
# que o Nginx serve por padrão
COPY . /usr/share/nginx/html

# a configuração do Nginx virá do docker-compose
# via volume — não precisamos copiar aqui

# expõe as portas HTTP e HTTPS
EXPOSE 80
EXPOSE 443