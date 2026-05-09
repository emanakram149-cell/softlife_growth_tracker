FROM php:8.2-apache

RUN a2dismod mpm_event mpm_worker || true && \
    a2enmod mpm_prefork

RUN docker-php-ext-install pdo pdo_mysql

RUN a2enmod rewrite

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html

CMD bash -c "sed -i 's/80/${PORT:-80}/g' /etc/apache2/ports.conf /etc/apache2/sites-enabled/000-default.conf && apache2-foreground"
