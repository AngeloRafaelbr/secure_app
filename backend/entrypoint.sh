#!/bin/sh

echo "Aguardando MySQL ficar pronto..."
until mysqladmin ping -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" --silent; do
  sleep 2
done

echo "Aplicando schema do banco..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /app/banco.sql

echo "Criando admin..."
node scripts/criarAdmin.js

echo "Iniciando servidor..."
exec node server.js