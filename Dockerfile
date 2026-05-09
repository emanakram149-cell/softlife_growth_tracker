FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
    libpdo-mysql-dev \
    && docker-php-ext-install pdo pdo_mysql

COPY . /app/

WORKDIR /app

EXPOSE 80

CMD php -S 0.0.0.0:${PORT:-80}
