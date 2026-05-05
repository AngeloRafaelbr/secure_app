# 🔒 SecureApp

Sistema web seguro de gerenciamento de usuários com autenticação JWT, política de senha, logs de auditoria, backup e restore do banco de dados e comunicação criptografada via HTTPS.

Desenvolvido como projeto acadêmico da disciplina de Segurança da Informação — UNINASSAU 2026.1.

> **Versão:** `1.0D`
> 
> | Sufixo | Significado |
> |---|---|
> | `D` | Testada rodando em Docker |
> | `L` | Testada rodando localmente |
> | `DL` ou `LD` | Testada em ambos os ambientes |

---

## 📋 Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Instalação e configuração](#instalação-e-configuração)
- [Rodando em desenvolvimento](#rodando-em-desenvolvimento)
- [Rodando com Docker](#rodando-com-docker)
- [Primeiro acesso](#primeiro-acesso)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Logs do sistema](#logs-do-sistema)
- [Backup e Restore](#backup-e-restore)
- [Endpoint Protection](#endpoint-protection)
- [Migração para produção-Passagem Para VM)](#migração-para-produção-passagem-para-vm)
- [Scripts úteis](#scripts-úteis)
- [Problemas comuns](#problemas-comuns)
- [Primeiro upload para o GIT](#primeiro-upload-para-o-git)

---

## Sobre o projeto

O SecureApp é um microsserviço de autenticação e auditoria de acessos. Ele centraliza o gerenciamento de usuários e pode ser integrado a outros sistemas de uma empresa, funcionando como ponto único de autenticação.

**Casos de uso:**
- **Intranet corporativa** — sistema interno de controle de usuários e acessos
- **Microsserviço de autenticação** — outros sistemas consultam o SecureApp para autenticar usuários via token JWT

---

## Funcionalidades

### Gerenciamento de Usuários
- Cadastro de usuários com perfil admin ou usuário comum
- Edição de dados cadastrais e troca de senha
- Exclusão de usuários pelo administrador
- Listagem completa com status e perfil

### Autenticação e Segurança
- Login com validação de credenciais
- Tokens JWT com expiração de 8 horas
- Bloqueio automático por 10 minutos após 5 tentativas falhas
- Política de senha com regras de complexidade
- Verificação das últimas 3 senhas para evitar reutilização
- Armazenamento de senhas com hash bcrypt (custo 12)

### Backup e Restore
- Backup manual via botão na interface web
- Backup agendado com configuração por interface visual
- Restore do banco a partir de arquivo de backup selecionado
- Listagem e exclusão de backups gerados
- Persistência em volume Docker

### Logs de Auditoria
- Registro em arquivo de todos os eventos do sistema
- Visualização dos logs pela interface web
- Eventos registrados: cadastro, alteração, exclusão, falhas de login, bloqueios, backup, restore

### Comunicação Segura
- HTTPS com certificado SSL
- HTTP redirecionado automaticamente para HTTPS

---

## Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript puro | — |
| Backend | Node.js + Express.js | Node 20 LTS |
| Banco de dados | MySQL | 8.0 |
| Autenticação | JWT (jsonwebtoken) | — |
| Hash de senha | bcryptjs | — |
| Logs | Winston | — |
| Agendamento | node-cron | — |
| Servidor web | Nginx | Alpine |
| Containerização | Docker + Docker Compose | — |
| SSL/TLS | Certificado auto-assinado | OpenSSL RSA 2048 |

---

## Pré-requisitos

### Para rodar com Docker (recomendado)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac)
- [Docker Engine + Docker Compose](https://docs.docker.com/engine/install/) (Linux/Debian)
- [Git](https://git-scm.com)

### Para rodar em desenvolvimento (sem Docker)
- [Node.js 20 LTS](https://nodejs.org) ou superior
- [MySQL 8.0](https://dev.mysql.com/downloads/) instalado localmente
- [Git](https://git-scm.com)

### Verificar instalações

```bash
node -v
# esperado: v20.x.x ou superior

npm -v
# esperado: 10.x.x ou superior

docker -v
# esperado: Docker version 27.x.x

docker compose version
# esperado: Docker Compose version v2.x.x

git --version
# esperado: git version 2.x.x
```

---

## Estrutura do projeto

```
meu-app/
├── frontend/
│   ├── css/
│   │   └── style.css              # estilos globais compartilhados
│   ├── js/
│   │   ├── login.js               # lógica da tela de login
│   │   ├── usuarios.js            # lógica da listagem de usuários
│   │   ├── usuarios-novo.js       # lógica do cadastro
│   │   ├── usuarios-editar.js     # lógica da edição
│   │   ├── backup.js              # lógica do backup e restore
│   │   └── logs.js                # lógica da visualização de logs
│   ├── login.html
│   ├── usuarios.html
│   ├── usuarios-novo.html
│   ├── usuarios-editar.html
│   ├── backup.html
│   ├── logs.html
│   └── Dockerfile                 # imagem Nginx para servir os HTMLs
├── backend/
│   ├── middleware/
│   │   └── auth.js                # verificação de token JWT
│   ├── routes/
│   │   ├── auth.js                # endpoints de login e logout
│   │   ├── usuarios.js            # endpoints CRUD de usuários
│   │   ├── backup.js              # endpoints de backup e restore
│   │   └── logs.js                # endpoints de visualização de logs
│   ├── scripts/
│   │   └── criarAdmin.js          # script para criar o admin inicial
│   ├── utils/
│   │   ├── logger.js              # sistema de logs com Winston
│   │   └── senha.js               # validação e hash de senha (bcrypt)
│   ├── logs/                      # gerado automaticamente pela aplicação
│   ├── backups/                   # gerado automaticamente pela aplicação
│   ├── banco.sql                  # script SQL de criação das tabelas
│   ├── database.js                # pool de conexão com o MySQL
│   ├── server.js                  # ponto de entrada da aplicação
│   ├── .env.example               # modelo do arquivo .env
│   ├── .dockerignore              # arquivos ignorados pelo Docker
│   └── Dockerfile                 # imagem Node.js do backend
├── ssl/
│   ├── cert.crt                   # certificado público SSL
│   └── cert.key                   # chave privada SSL (não commitada)
├── nginx.conf                     # configuração do Nginx (proxy + HTTPS)
├── docker-compose.yml             # orquestração dos containers
├── .env                           # variáveis de ambiente (não commitado)
├── .env.example                   # modelo do .env da raiz
├── .gitignore
└── README.md
```

---

## Instalação e configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/AngeloRafaelbr/secure-app.git
cd secure-app
```

### 2. Configurar as variáveis de ambiente⚠️
#ABAIXO É APRESENADO MODELO DOS .env NECESSÁRIOS!

**Passo 2.1 — Arquivo `.env` na raiz** (usado pelo Docker Compose):

#Comando para copiar o .env modelo disponibilizado (ou crie arquivo e copie e cole daqui)
```bash
# copie o modelo
cp .env.example .env

# abra e edite com suas configurações
nano .env
```

ℹ️Conteúdo do `.env` da raiz(usado pelo Docker Compose):

```bash
# Banco de dados MySQL
MYSQL_ROOT_PASSWORD=SUASENHA
MYSQL_ROOT_USER=root
MYSQL_DATABASE=meu_app

# Chave secreta para assinar tokens JWT
# use uma string longa e aleatória em produção
JWT_SECRET=substitua-por-uma-chave-longa-e-aleatoria-aqui

#A senha aqui precisa ser **a mesma** do `.env` de /backend — porque é o mesmo banco.
#sobe o MySQL com essa senha - Docker lê isso
#Este .env é usado para produção em docker, não para desenvolvimento local. Para desenvolvimento local, rodando o node server.js, use o .env de /backend.
```

**Passo 2.2 — Arquivo `backend/.env`** (usado pelo Node.js):

#Comando para copiar o .env modelo disponibilizado (ou crie arquivo e copie e cole daqui)
```bash
cd backend
cp .env.example .env
nano .env
cd ..
```

ℹ️Conteúdo do `backend/.env` (usado pelo Node.js):

```bash
# Banco de dados
# use "localhost" em desenvolvimento sem Docker
# use "mysql" quando rodar com Docker
DB_HOST=mysql
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUASENHA
DB_NAME=meu_app

# JWT — deve ser igual ao JWT_SECRET do .env da raiz
JWT_SECRET=substitua-por-uma-chave-longa-e-aleatoria-aqui

# Porta do servidor Node.js
PORT=3000

# Fuso horário — ajuste para sua região
TZ=America/Recife
```

> ⚠️ **Atenção:** a `JWT_SECRET` deve ser **exatamente igual** nos dois arquivos `.env`.

> ⚠️ **Segurança:** nunca compartilhe ou publique os arquivos `.env`. Eles estão no `.gitignore` por esse motivo.

### 3. Gerar o certificado SSL

```bash
# na raiz do projeto
mkdir -p ssl

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/cert.key \
  -out ssl/cert.crt \
  -subj "/CN=meuapp/O=MeuApp/C=BR"
```

Verifique se os arquivos foram gerados:

```bash
ls -la ssl/
# deve aparecer cert.crt e cert.key
```

> ℹ️ Se o OpenSSL não estiver instalado no Windows, baixe em:
> https://slproweb.com/products/Win32OpenSSL.html (versão Light é suficiente)

---

## Rodando com Docker

> ✅ Opção recomendada. Sobe o banco, backend e frontend com um único comando.

### Passo 1 — Verificar pré-requisitos

Certifique-se que completou a seção [Instalação e configuração](#instalação-e-configuração):
- ✅ `.env` da raiz configurado
- ✅ `backend/.env` configurado
- ✅ `ssl/cert.crt` e `ssl/cert.key` gerados

### Passo 2 — Subir os containers

```bash
# na raiz do projeto (onde está o docker-compose.yml)
docker compose up -d --build
```

Na primeira execução o processo demora mais pois:
- Baixa as imagens base (Node.js, MySQL, Nginx)
- Instala as dependências do Node.js
- Constrói as imagens customizadas

Acompanhe o progresso:

```bash
docker compose logs -f
```

Aguarde aparecer as mensagens:
```
backend_app  | Banco de dados conectado com sucesso!
backend_app  | Servidor rodando em http://localhost:3000
```

Pressione `Ctrl+C` para sair dos logs sem parar os containers.

### Passo 3 — Verificar os containers

```bash
docker compose ps
```

Resultado esperado:
```
NAME            STATUS
mysql_app       running (healthy)
backend_app     running
frontend_app    running
```

> Se algum container não estiver `running`, verifique os logs:
> `docker compose logs NOME_DO_CONTAINER`

### Passo 4 — Criar as tabelas no banco

```bash
docker exec -i mysql_app mysql -u root -psenha123 meu_app < backend/banco.sql
```

Verifique se as tabelas foram criadas corretamente:

```bash
docker exec -it mysql_app mysql -u root -psenha123 meu_app -e "SHOW TABLES;"
```

Resultado esperado:
```
+----------------------+
| Tables_in_meu_app    |
+----------------------+
| backup_agendamentos  |
| historico_senhas     |
| usuarios             |
+----------------------+
```

### Passo 5 — Criar o usuário administrador

```bash
docker exec -it backend_app node scripts/criarAdmin.js
```

Resultado esperado:
```
Banco de dados conectado com sucesso!
Admin criado com sucesso!
Username: admin
Senha:    Admin@12345!
⚠️  Troque a senha após o primeiro login!
```

### Passo 6 — Acessar a aplicação

Abra o browser e acesse:

```
# na mesma máquina
https://localhost

# de outra máquina na rede
https://IP_DO_SERVIDOR
```

> O browser exibirá um aviso de certificado auto-assinado.
> Clique em **Avançar** → **Ir para o site** (ou equivalente no seu browser).
> Isso é esperado para certificados auto-assinados em rede local.

---

## Rodando em desenvolvimento

> Use essa opção se quiser rodar sem Docker, com MySQL instalado localmente.

### Passo 1 — Configurar o `backend/.env` para desenvolvimento

```bash
DB_HOST=localhost    # não "mysql" — conecta no MySQL local
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_mysql_local
DB_NAME=meu_app
JWT_SECRET=sua-chave-secreta
PORT=3000
TZ=America/Recife
```

### Passo 2 — Criar o banco de dados

```bash
mysql -u root -p
```

```sql
CREATE DATABASE meu_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Passo 3 — Instalar dependências do backend

```bash
cd backend
npm install
```

### Passo 4 — Criar as tabelas

```bash
mysql -u root -p meu_app < banco.sql
```

### Passo 5 — Criar o usuário admin

```bash
node scripts/criarAdmin.js
```

### Passo 6 — Iniciar o servidor

```bash
node server.js
```

Resultado esperado:
```
Banco de dados conectado com sucesso!
Servidor rodando em http://localhost:3000
```

### Passo 7 — Abrir o frontend

Abra o arquivo `frontend/login.html` diretamente no browser
ou use a extensão **Live Server** do VS Code.

> ⚠️ Em desenvolvimento o acesso é via `http://localhost` sem HTTPS.
> Para HTTPS completo é necessário rodar com Docker e Nginx.

---

## Primeiro acesso

Após a instalação, faça login com as credenciais iniciais do admin:

```
Username: admin
Senha:    Admin@12345!
```

> ⚠️ **Troque a senha imediatamente após o primeiro login!**
> Acesse: Usuários → Editar → preencha Nova Senha

### Política de senha obrigatória

A nova senha deve atender todos os critérios:

| Critério | Exemplo |
|---|---|
| Mínimo 10 caracteres | `MinhaSenh@2026` tem 14 ✅ |
| Pelo menos uma maiúscula | `M` ✅ |
| Pelo menos uma minúscula | `inha` ✅ |
| Pelo menos um número | `2026` ✅ |
| Pelo menos um caractere especial | `@` ✅ |
| Diferente das 3 últimas senhas | verificado automaticamente ✅ |

---

## Variáveis de ambiente

### `.env` da raiz

| Variável | Descrição | Valor padrão |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Senha do root do MySQL | — |
| `MYSQL_ROOT_USER` | Usuário do MySQL | `root` |
| `MYSQL_DATABASE` | Nome do banco de dados | `meu_app` |
| `JWT_SECRET` | Chave secreta para assinar tokens JWT | — |

### `backend/.env`

| Variável | Desenvolvimento | Docker |
|---|---|---|
| `DB_HOST` | `localhost` | `mysql` |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | `root` | `root` |
| `DB_PASSWORD` | sua senha local | mesma do `.env` raiz |
| `DB_NAME` | `meu_app` | `meu_app` |
| `JWT_SECRET` | mesma do `.env` raiz | mesma do `.env` raiz |
| `PORT` | `3000` | `3000` |
| `TZ` | `America/Recife` | `America/Recife` |

---

## Banco de dados

### Tabelas

**`usuarios`**
```
id               → identificador único (auto increment)
username         → nome de usuário (único)
email            → email (único)
password_hash    → senha armazenada como hash bcrypt
role             → perfil: 'admin' ou 'user'
tentativas_falhas → contador de tentativas de login falhas
bloqueado_ate    → data/hora de desbloqueio (null = não bloqueado)
criado_em        → data de cadastro
```

**`historico_senhas`**
```
id           → identificador único
usuario_id   → referência ao usuário (FK)
password_hash → hash da senha anterior
criado_em    → data em que foi usada
```
> Guarda as últimas 3 senhas de cada usuário para evitar reutilização.

**`backup_agendamentos`**
```
id             → identificador único
cron_expressao → expressão cron do agendamento
descricao      → descrição legível
ativo          → 1 = ativo, 0 = pausado
ultimo_backup  → data/hora do último backup executado
criado_em      → data de criação do agendamento
```

### Recriar o banco do zero

```bash
# com Docker
docker exec -i mysql_app mysql -u root -psenha123 meu_app < backend/banco.sql

# sem Docker
mysql -u root -p meu_app < backend/banco.sql
```

---

## Endpoints da API

> Todos os endpoints protegidos exigem o header:
> `Authorization: Bearer SEU_TOKEN_JWT`

### Autenticação

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| POST | `/auth/login` | Fazer login | ❌ |
| POST | `/auth/logout` | Registrar logout | ✅ JWT |
Obs.: O login é a porta de entrada — é justamente ele que gera o token. Não faz sentido exigir o token antes de gerá-lo.
✅ Não retorna dados sensíveis sem credenciais corretas
✅ Tem bloqueio após 5 tentativas falhas
✅ Fail2Ban bloqueia IPs suspeitos
✅ HTTPS criptografa a comunicação
✅ bcrypt protege as senhas no banco

**Exemplo de login:**
```bash
curl -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@12345!"}' \
  -k
```

### Usuários

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/usuarios` | Listar todos | ✅ JWT |
| GET | `/usuarios/:id` | Buscar um | ✅ JWT |
| POST | `/usuarios` | Criar | ✅ Admin |
| PUT | `/usuarios/:id` | Editar | ✅ JWT |
| DELETE | `/usuarios/:id` | Excluir | ✅ Admin |

### Backup

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| POST | `/backup/agora` | Backup manual | ✅ Admin |
| GET | `/backup/listar` | Listar arquivos | ✅ Admin |
| POST | `/backup/restaurar` | Restaurar banco | ✅ Admin |
| DELETE | `/backup/deletar/:arquivo` | Excluir backup | ✅ Admin |
| POST | `/backup/agendar` | Criar agendamento | ✅ Admin |
| GET | `/backup/agendamentos` | Listar agendamentos | ✅ Admin |
| DELETE | `/backup/agendamentos/:id` | Remover agendamento | ✅ Admin |

### Logs

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/logs` | Ver todos os logs | ✅ Admin |
| GET | `/logs/erros` | Ver apenas erros | ✅ Admin |

### Health Check

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/health` | Status do servidor | ❌ |
Obs.:o health serve para verificar rapidamente se o servidor está rodando — sem precisar de credenciais. É usado por ferramentas de monitoramento, balanceadores de carga e pelo próprio Docker.
✅ Retorna apenas { "status": "servidor rodando" }
✅ Não expõe dados do banco
✅ Não expõe configurações internas
✅ Não permite nenhuma ação no sistema

---

## Logs do sistema

Os logs ficam salvos em:

```
backend/logs/
  ├── app.log      → todos os eventos
  └── erros.log   → apenas erros
```

### Formato das linhas de log

```
[DD/MM/YYYY HH:MM:SS] [NÍVEL] EVENTO | usuário: "X" | Descrição.
```

### Eventos registrados

| Evento | Nível | Requisito |
|---|---|---|
| Cadastro de usuário | INFO | 3.1 |
| Alteração de dados/senha | INFO | 3.2 |
| Exclusão de usuário | INFO | 3.3 |
| Falha de autenticação | WARN | 3.4 |
| Bloqueio após 5 falhas | WARN | 3.5 |
| Login bem-sucedido | INFO | 3.6 |
| Logout | INFO | 3.6 |
| Backup realizado | INFO | 3.6 |
| Restore realizado | INFO | 3.6 |
| Backup agendado | INFO | 3.6 |

### Visualizar logs via terminal

```bash
# acompanhar em tempo real
docker exec -it backend_app tail -f /app/logs/app.log

# ver últimas 100 linhas
docker exec -it backend_app tail -n 100 /app/logs/app.log

# copiar para a máquina local
docker cp backend_app:/app/logs/app.log ./app.log
```

---

## Backup e Restore

### Backup manual

```
1. Acesse o menu Backup
2. Clique em "Fazer Backup Agora"
3. O arquivo é gerado e aparece na lista
```

Formato do nome do arquivo:
```
backup_2026-04-07_15-00-00.sql
```

### Backup agendado

```
1. Acesse o menu Backup
2. Preencha a expressão cron e a descrição
3. Clique em "Salvar Agendamento"
```

Exemplos de expressão cron:

| Expressão | Executa |
|---|---|
| `0 2 * * *` | Todo dia às 02:00 |
| `0 */6 * * *` | A cada 6 horas |
| `0 3 * * 1` | Toda segunda às 03:00 |
| `0 0 * * 0` | Todo domingo à meia-noite |
| `0 0 1 * *` | Todo dia 1 do mês |

> Os agendamentos são persistidos no banco e reativados automaticamente quando o servidor reinicia.

### Restore

```
1. Acesse o menu Backup
2. Selecione o arquivo na lista "Restaurar Backup"
3. Confirme a operação
```

> ⚠️ O restore sobrescreve TODOS os dados atuais do banco.

### Gerenciar backups via terminal

```bash
# listar backups gerados
docker exec -it backend_app ls -lh /app/backups/

# copiar um backup para a máquina local
docker cp backend_app:/app/backups/backup_2026-04-07.sql ./

# enviar um backup local para o container
docker cp ./backup_2026-04-07.sql backend_app:/app/backups/
```

---

## Endpoint Protection

As seguintes ferramentas devem ser instaladas na VM de produção (VM Testada foi a DEBIAN):

### UFW — Firewall (autorizar ou não autorizar comunicação através das portas)

```bash
# instalar e configurar
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (redirecionado para HTTPS)
sudo ufw allow 443   # HTTPS
sudo ufw enable

# verificar
sudo ufw status verbose
```

### Fail2Ban — Bloqueio de força bruta (Monitoramento das portas, com possível bloqueio se for suspeito)
#No caso so foi utilizado uma jail, sshd, monitorando a porta do ssh (22)

```bash
# instalar
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# verificar
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### ClamAV — Antivírus (Proteção por varredura, podendo ser ativada varredura em tempo real ou automatizando por CRON)

```bash
# instalar
sudo apt install clamav clamav-daemon -y
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl enable clamav-freshclam clamav-daemon
sudo systemctl start clamav-freshclam clamav-daemon

# verificar
sudo systemctl status clamav-daemon

# agendar scan diário (editar crontab)
sudo crontab -e
```

Adicionar no crontab:
```bash
# scan diário às 03:00 com log por data
0 3 * * * clamscan /home/ -r --log=/var/log/clamav/scan-$(date +\%Y-\%m-\%d).log

# limpeza de logs com mais de 30 dias às 03:30
30 3 * * * find /var/log/clamav/ -name 'scan-*.log' -mtime +30 -delete
```

### Verificar todos os serviços de uma vez

```bash
sudo systemctl status ufw fail2ban clamav-daemon clamav-freshclam
```

---

## Migração para produção-Passagem Para VM

### Transferir para VM Debian

**Na VM Debian — instalar o Docker:**

```bash
# atualizar o sistema
sudo apt update && sudo apt upgrade -y

# instalar dependências
sudo apt install -y ca-certificates curl gnupg

# adicionar chave GPG do Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# adicionar repositório oficial
echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# verificar
docker -v
docker compose version
```

**Transferir o projeto via WinSCP ou SCP:**

```bash
# do Windows para a VM (via terminal)
scp -r ./meu-app usuario@192.168.1.12:/home/usuario/
```

**Configurar e subir na VM:**

```bash
cd ~/meu-app

# gerar certificado SSL
mkdir -p ssl
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/cert.key \
  -out ssl/cert.crt \
  -subj "/CN=meuapp/O=MeuApp/C=BR"

# configurar variáveis de ambiente
nano .env
nano backend/.env

# subir os containers
docker compose up -d --build

# criar tabelas
docker exec -i mysql_app mysql -u root -psenha123 meu_app < backend/banco.sql

# criar admin
docker exec -it backend_app node scripts/criarAdmin.js
```

**Acessar de qualquer máquina na rede:**

```
https://192.168.1.12
#OU IP CORRESPONDENTE AO SEU SERVIDOR(VM)
```

---

## Scripts úteis

### Gerenciar containers

```bash
# subir todos os containers
docker compose up -d

# subir e reconstruir imagens
docker compose up -d --build

# parar todos os containers (mantém volumes)
docker compose down

# parar e apagar volumes (apaga dados do banco)
docker compose down --volumes

# reiniciar um container específico
docker compose restart backend

# ver status de todos os containers
docker compose ps
```

### Ver logs dos containers

```bash
# todos os containers
docker compose logs -f

# container específico
docker compose logs -f backend
docker compose logs -f mysql
docker compose logs -f frontend
```

### Gerenciar o banco

```bash
# acessar o MySQL interativamente
docker exec -it mysql_app mysql -u root -psenha123 meu_app

# recriar as tabelas
docker exec -i mysql_app mysql -u root -psenha123 meu_app < backend/banco.sql

# recriar o admin
docker exec -it backend_app node scripts/criarAdmin.js
```

### Gerenciar volumes e dados

```bash
# listar volumes Docker
docker volume ls

# ver onde os dados do banco estão armazenados
docker volume inspect meu-app_mysql_data

# listar backups gerados
docker exec -it backend_app ls -lh /app/backups/

# copiar backup para a máquina local
docker cp backend_app:/app/backups/ARQUIVO.sql ./

# copiar todos os logs para a máquina local
docker cp backend_app:/app/logs/app.log ./app.log
docker cp backend_app:/app/logs/erros.log ./erros.log
```

### Reconstruir do zero

```bash
# para e remove containers
docker compose down

# reconstrói sem usar cache
docker compose build --no-cache backend
docker compose build --no-cache frontend

# sobe novamente
docker compose up -d
```

---

## Problemas comuns

### Erro: `Access denied for user ''@'...'`
```
Causa:   arquivo .env não encontrado ou mal configurado
Solução: verificar se backend/.env existe e tem DB_PASSWORD correto
         verificar se não há espaços ao redor do = nas variáveis
```

### Erro: `Cannot connect to database` ou `ECONNREFUSED`
```
Causa:   MySQL ainda não terminou de inicializar
Solução: aguardar 20-30 segundos após subir os containers
         verificar: docker compose logs mysql
```

### Erro no backup: `mysqldump: unknown variable ssl-mode`
```
Causa:   Dockerfile usando imagem Alpine com cliente MariaDB
Solução: verificar se o Dockerfile do backend usa:
           FROM node:20-bookworm-slim
           RUN apt-get install -y default-mysql-client
```

### Browser bloqueia o HTTPS com erro de certificado
```
Causa:   certificado auto-assinado não reconhecido pelo browser
Solução: clicar em "Avançar" → "Ir para o site (não seguro)"
         isso é esperado para certificados auto-assinados
```

### Porta 80 ou 443 já está em uso
```
Causa:   outro serviço usando a mesma porta
Solução: parar o serviço conflitante ou mudar a porta no docker-compose.yml
         verificar no Windows: netstat -ano | findstr :443
         verificar no Linux:   sudo lsof -i :443
```

### Container backend para imediatamente após iniciar
```
Causa:   erro no código ou variável de ambiente faltando
Solução: docker compose logs backend
         verificar se todas as variáveis do .env estão preenchidas
```

### Agendamento de backup não executa
```
Causa:   servidor foi reiniciado e os jobs foram perdidos
         (só acontece se o banco estiver vazio)
Solução: a função recarregarAgendamentos() é chamada automaticamente
         ao iniciar o servidor e recria os jobs do banco
         verificar: docker compose logs backend
```
---

## Primeiro upload para o GIT

- .gitignore :

#dependências — pesado e pode ser reinstalado
node_modules/

#variáveis de ambiente — NUNCA subir
.env
backend/.env

#certificados SSL — não subir chave privada
ssl/cert.key

#logs gerados pela aplicação
backend/logs/

#backups gerados pela aplicação
backend/backups/

#arquivos de sistema
.DS_Store
Thumbs.db

- O que subiu (ou não)?

✅ frontend/     → subiu
✅ backend/      → subiu
✅ nginx.conf    → subiu
✅ docker-compose.yml → subiu
✅ README.md          → subiu
✅ .env.example       → subiu
✅ backend/.env.example → subiu
✅ ssl/cert.crt  → subiu (certificado público, ok)

❌ .env          → NÃO subiu (correto)
❌ backend/.env  → NÃO subiu (correto)
❌ ssl/cert.key  → NÃO subiu (correto)
❌ node_modules/ → NÃO subiu (correto)
❌ backend/logs/ → NÃO subiu (correto)
❌ backend/backups/ → NÃO subiu (correto)

---

## Licença

Projeto acadêmico — UNINASSAU 2026.1
Disciplina: Tópicos Integradores de Sistemas de Informação — Segurança da Informação
Orientador: Prof. Kelmo Siqueira

Grupo:
- Ângelo Rafael Oliveira Cunha Santos
- Thaís Helena Ramos de Melo
- Túlio Angelus Torres de Melo Mendes
- Julio Cesar Braga Maciel de Souza
