# troca alpine por bookworm-slim (baseado em Debian)
# tem acesso ao cliente MySQL oficial
FROM node:20-bookworm-slim

# instala o cliente MySQL oficial
# que suporta caching_sha2_password do MySQL 8.0
RUN apt-get update && \
    apt-get install -y default-mysql-client && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# define o fuso horário na imagem
ENV TZ=America/Recife

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

RUN mkdir -p logs backups

EXPOSE 3000

CMD ["node", "server.js"]