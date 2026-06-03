# 🔒 SecureApp

Sistema web seguro de gerenciamento de usuários com autenticação JWT via cookie HttpOnly, política de senha, logs de auditoria, backup e restore do banco de dados, sistemas integrados e comunicação criptografada via HTTPS.

Desenvolvido como projeto acadêmico da disciplina de Segurança da Informação — UNINASSAU 2026.1.

> **Versão:** `1.6DL`
>
> | Sufixo | Significado |
> |---|---|
> | `D` | Testada rodando em Docker |
> | `L` | Testada rodando localmente |
> | `DL` | Testada em ambos os ambientes |

---

## 📋 Índice

- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Pré-requisitos](#pré-requisitos)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Instalação e configuração](#instalação-e-configuração)
- [Alternando entre ambientes](#alternando-entre-ambientes)
- [Rodando em desenvolvimento local](#rodando-em-desenvolvimento-local)
- [Rodando com Docker](#rodando-com-docker)
- [Primeiro acesso](#primeiro-acesso)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Endpoints da API](#endpoints-da-api)
- [Logs do sistema](#logs-do-sistema)
- [Backup e Restore](#backup-e-restore)
- [Sistemas Integrados](#sistemas-integrados)
- [Endpoint Protection](#endpoint-protection)
- [Migração para produção — VM Debian](#migração-para-produção--vm-debian)
- [Scripts úteis](#scripts-úteis)
- [Problemas comuns](#problemas-comuns)
- [Git — o que sobe e o que não sobe](#git--o-que-sobe-e-o-que-não-sobe)

---

## Sobre o projeto

O SecureApp é um microsserviço de autenticação e auditoria de acessos. Ele centraliza o gerenciamento de usuários e pode ser integrado a outros sistemas de uma empresa, funcionando como ponto único de autenticação.

**Casos de uso:**
- **Intranet corporativa** — sistema interno de controle de usuários e acessos
- **Microsserviço de autenticação** — outros sistemas consultam o SecureApp para validar tokens JWT e registrar autenticações, sem precisar reimplementar toda a lógica de segurança

---

## Funcionalidades

### Gerenciamento de Usuários
- Cadastro de usuários com perfil admin ou usuário comum
- Edição de dados cadastrais e troca de senha
- Exclusão de usuários pelo administrador
- Listagem completa com status e perfil

### Autenticação e Segurança
- Login com validação de credenciais
- Token JWT armazenado em cookie HttpOnly (não acessível via JavaScript — protege contra XSS)
- Expiração do token em 8 horas
- Bloqueio automático por 10 minutos após 5 tentativas de login falhas
- Política de senha com regras de complexidade
- Verificação das últimas 3 senhas para evitar reutilização
- Armazenamento de senhas com hash bcrypt (custo 12)
- Controle de perfis (admin e usuário comum) verificado no backend a cada requisição

### Backup e Restore
- Backup manual via botão na interface web
- Backup agendado com interface visual (checkboxes de dias da semana + horário, ou calendário para data específica)
- Restore do banco a partir de arquivo de backup selecionado
- Listagem e exclusão de backups gerados
- Persistência em volume Docker

### Sistemas Integrados
- Cadastro de sistemas externos com geração automática de `api_key`
- Consulta de nível de acesso em tempo real (Pull): o SecureApp consulta cada sistema cadastrado ao abrir o perfil do usuário
- Status online/offline de cada sistema integrado
- Histórico de autenticações: registro de quem se autenticou, quando e para qual sistema
- Endpoint `POST /auth/verificar-token` para sistemas externos validarem tokens JWT

### Logs de Auditoria
- Registro em arquivo de todos os eventos do sistema
- Visualização dos logs pela interface web
- Eventos registrados: cadastro, alteração, exclusão, falhas de login, bloqueios, backup, restore, autenticações externas

### Comunicação Segura
- HTTPS com certificado SSL auto-assinado (OpenSSL RSA 2048)
- HTTP redirecionado automaticamente para HTTPS

---

## Stack tecnológica

| Camada | Tecnologia | Versão / Detalhes |
|---|---|---|
| Frontend | HTML5 + CSS3 + JavaScript puro | Sem framework |
| Backend | Node.js + Express.js | Node 20 LTS |
| Banco de dados | MySQL | 8.0 |
| Autenticação | JWT via cookie HttpOnly | jsonwebtoken |
| Hash de senha | bcryptjs | custo 12 |
| Logs | Winston | — |
| Agendamento | node-cron | — |
| Servidor web | Nginx | Proxy reverso + HTTPS |
| Containerização | Docker + Docker Compose | 3 containers |
| SSL/TLS | Certificado auto-assinado | OpenSSL RSA 2048 |
| SO da VM | Debian GNU/Linux | 13.4.0 — VirtualBox |

---

## Pré-requisitos

### Para rodar com Docker (recomendado para produção e teste final)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (Windows/Mac)
- [Docker Engine + Docker Compose](https://docs.docker.com/engine/install/) (Linux/Debian)
- [Git](https://git-scm.com)

### Para rodar em desenvolvimento local (recomendado para desenvolvimento ativo)
- [Node.js 20 LTS](https://nodejs.org) ou superior
- MySQL 8.0 **rodando em Docker** (só o container do banco) — veja a seção [Rodando em desenvolvimento local](#rodando-em-desenvolvimento-local)
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
│   │   ├── config.js              # ⚠️ URL da API centralizada — MUDE AQUI ao trocar de ambiente
│   │   ├── api.js                 # fetchAutenticado, verificarAutenticacao, fazerLogout
│   │   ├── login.js
│   │   ├── usuarios.js
│   │   ├── usuarios-novo.js
│   │   ├── usuarios-editar.js
│   │   ├── backup.js
│   │   ├── logs.js
│   │   └── sistemas.js            # lógica da tela de sistemas integrados
│   ├── login.html
│   ├── usuarios.html
│   ├── usuarios-novo.html
│   ├── usuarios-editar.html
│   ├── backup.html
│   ├── logs.html
│   ├── sistemas.html              # tela de sistemas integrados
│   └── Dockerfile                 # imagem Nginx para servir os HTMLs
├── backend/
│   ├── middleware/
│   │   └── auth.js                # lê token do cookie HttpOnly (fallback: header Authorization)
│   ├── routes/
│   │   ├── auth.js                # login, logout, /me, verificar-token
│   │   ├── usuarios.js            # CRUD de usuários
│   │   ├── backup.js              # backup e restore
│   │   ├── logs.js                # visualização de logs
│   │   └── sistemas.js            # CRUD de sistemas, consulta de acessos, autenticações
│   ├── scripts/
│   │   └── criarAdmin.js          # script para criar o admin inicial
│   ├── utils/
│   │   ├── logger.js              # sistema de logs com Winston
│   │   └── senha.js               # validação, hash bcrypt, histórico de senhas
│   ├── logs/                      # gerado automaticamente pela aplicação
│   ├── backups/                   # gerado automaticamente pela aplicação
│   ├── banco.sql                  # script SQL completo com todas as tabelas
│   ├── database.js                # pool de conexão com o MySQL
│   ├── server.js                  # ponto de entrada da aplicação
│   ├── .env.example               # modelo do arquivo .env
│   ├── .dockerignore
│   └── Dockerfile                 # imagem Node.js do backend
├── sistemas-fake/
│   ├── sistema-financeiro.js      # app-fake — porta 4000
│   └── sistema-medico.js          # app-fake — porta 4001
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

Estes passos são necessários **uma única vez**, independente de qual ambiente você vai usar.

### 1. Clonar o repositório

```bash
git clone https://github.com/AngeloRafaelbr/secure-app.git
cd secure-app
```

### 2. Configurar as variáveis de ambiente

> ⚠️ São necessários **dois** arquivos `.env`: um na raiz (usado pelo Docker Compose) e um dentro de `backend/` (usado pelo Node.js).

**Passo 2.1 — Arquivo `.env` na raiz** (Docker Compose):

```bash
cp .env.example .env
nano .env   # ou abra no VS Code
```

Conteúdo:

```bash
# Banco de dados MySQL — Docker usa essas variáveis para criar o banco
MYSQL_ROOT_PASSWORD=SUASENHA
MYSQL_ROOT_USER=root
MYSQL_DATABASE=meu_app

# Chave secreta para assinar tokens JWT — deve ser longa e aleatória
JWT_SECRET=substitua-por-uma-chave-longa-e-aleatoria-aqui
```

> ℹ️ Este arquivo é lido pelo Docker Compose para subir o container MySQL e injetar variáveis no backend. **Não é usado** quando o backend roda diretamente com `node server.js`.

**Passo 2.2 — Arquivo `backend/.env`** (Node.js):

```bash
cd backend
cp .env.example .env
nano .env   # ou abra no VS Code
cd ..
```

Conteúdo:

```bash
# Banco de dados
# Use "localhost" para desenvolvimento local
# Use "mysql" quando rodar tudo com Docker (o docker-compose.yml sobrescreve automaticamente)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=SUASENHA    # mesma senha do .env da raiz
DB_NAME=meu_app

# JWT — deve ser exatamente igual ao JWT_SECRET do .env da raiz
JWT_SECRET=substitua-por-uma-chave-longa-e-aleatoria-aqui

# Porta do servidor Node.js
PORT=3000

# Fuso horário — ajuste para sua região
TZ=America/Recife
```

> ⚠️ `JWT_SECRET` **deve ser idêntica** nos dois arquivos `.env`.
> ⚠️ `DB_PASSWORD` **deve ser idêntica** nos dois arquivos `.env`.
> ⚠️ Nunca suba os arquivos `.env` para o Git — eles estão no `.gitignore`.

### 3. Gerar o certificado SSL

Necessário apenas para rodar com Docker (o Nginx exige o certificado para subir).

```bash
# na raiz do projeto
mkdir -p ssl

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout ssl/cert.key \
  -out ssl/cert.crt \
  -subj "/CN=meuapp/O=MeuApp/C=BR"
```

Verifique:

```bash
ls -la ssl/
# deve aparecer cert.crt e cert.key
```

> ℹ️ No Windows sem OpenSSL instalado: baixe em https://slproweb.com/products/Win32OpenSSL.html (versão Light é suficiente).

---

## Alternando entre ambientes

O único arquivo que muda ao trocar de ambiente é `frontend/js/config.js`:

```js
// DESENVOLVIMENTO LOCAL — Node.js rodando diretamente
const API_URL = 'http://localhost:3000'

// DOCKER — Nginx fazendo proxy para o backend
// const API_URL = '/api'
```

Comente/descomente a linha correspondente ao ambiente desejado. **Todos os outros arquivos JS** importam `API_URL` deste arquivo — nada mais precisa ser alterado.

> ⚠️ **Nunca suba `config.js` com `API_URL = 'http://localhost:3000'`** para o GitHub. A aplicação não funcionará em Docker com esse valor.

---

## Rodando em desenvolvimento local

Use essa opção para desenvolver ativamente. Alterações no código refletem imediatamente — sem precisar rebuildar containers.

```
Com Docker completo:
  altera código → docker compose down → docker compose up -d --build → aguarda rebuild → testa → repete...

Com desenvolvimento local:
  altera código → salva → testa (imediato)
```

| Componente | Docker completo | Desenvolvimento local |
|---|---|---|
| MySQL | container mysql_app | container mysql_app (só ele) |
| Backend | container backend_app | `node server.js` direto |
| Frontend | container Nginx | arquivo aberto no browser / Live Server |
| `config.js` `API_URL` | `/api` | `http://localhost:3000` |
| `backend/.env` `DB_HOST` | sobrescrito para `mysql` | `localhost` |
| HTTPS | ✅ via Nginx | ❌ HTTP puro (normal em dev) |

### Passo 1 — Parar todos os containers (se estiverem rodando)

```bash
docker compose down
```

### Passo 2 — Subir apenas o MySQL

```bash
docker compose up -d mysql
```

Verifique:

```bash
docker compose ps
# NAME        STATUS
# mysql_app   running (healthy)
```

### Passo 3 — Confirmar `backend/.env`

```bash
DB_HOST=localhost
```

> ℹ️ Em Docker completo o `docker-compose.yml` sobrescreve `DB_HOST` para `mysql` automaticamente. Em desenvolvimento local o `backend/.env` é lido diretamente — por isso precisa ser `localhost`.

### Passo 4 — Atualizar `frontend/js/config.js`

```js
const API_URL = 'http://localhost:3000'
// const API_URL = '/api'
```

### Passo 5 — Instalar dependências do backend (primeira vez)

```bash
cd backend
npm install
cd ..
```

### Passo 6 — Iniciar o backend

```bash
cd backend
node server.js
```

Esperado:
```
Banco de dados conectado com sucesso!
Servidor rodando em http://localhost:3000
```

Confirme que está respondendo:
```
http://localhost:3000/health
→ { "status": "servidor rodando" }
```

### Passo 7 — Abrir o frontend

Abra `frontend/login.html` diretamente no browser ou use a extensão **Live Server** do VS Code (serve os arquivos em `http://127.0.0.1:5500` com recarregamento automático ao salvar).

### Passo 8 — (Opcional) Subir os apps-fake de sistemas integrados

Se quiser testar a funcionalidade de sistemas integrados:

```bash
# em terminais separados
node sistemas-fake/sistema-financeiro.js   # porta 4000
node sistemas-fake/sistema-medico.js       # porta 4001
```

---

### Voltando para Docker após o desenvolvimento

Antes de commitar, reverta:

**1. `frontend/js/config.js`:**

```js
// const API_URL = 'http://localhost:3000'
const API_URL = '/api'
```

**2. Parar o MySQL:**

```bash
docker compose down
```

**3. Subir tudo no Docker:**

```bash
docker compose up -d --build
```

**4. Testar:**

```
https://localhost
```

**5. Se estiver funcionando — commitar:**

```bash
git add .
git commit -m "feat: descrição do que foi desenvolvido"
git push
```

---

## Rodando com Docker

> ✅ Opção recomendada para testes completos e produção. HTTPS funciona apenas aqui.

### Pré-requisitos verificados

Antes de continuar, confirme que completou a seção [Instalação e configuração](#instalação-e-configuração):

- ✅ `.env` da raiz configurado
- ✅ `backend/.env` configurado com `DB_HOST=localhost` (o docker-compose.yml sobrescreve para `mysql`)
- ✅ `ssl/cert.crt` e `ssl/cert.key` gerados
- ✅ `frontend/js/config.js` com `API_URL = '/api'`

### Passo 1 — Subir os containers

```bash
# na raiz do projeto
docker compose up -d --build
```

Na primeira execução o processo demora mais: baixa imagens base, instala dependências do Node.js e constrói as imagens.

Acompanhe o progresso:

```bash
docker compose logs -f
```

Aguarde:
```
backend_app  | Banco de dados conectado com sucesso!
backend_app  | Servidor rodando em http://localhost:3000
```

`Ctrl+C` sai dos logs sem parar os containers.

### Passo 2 — Verificar os containers

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

> Se algum container não estiver `running`: `docker compose logs NOME_DO_CONTAINER`

### Passo 3 — Criar as tabelas no banco

> ⚠️ Substitua `SUASENHA` pela senha definida em `MYSQL_ROOT_PASSWORD` no seu `.env`.

```bash
docker exec -i mysql_app mysql -u root -pSUASENHA meu_app < backend/banco.sql
```

Verifique:

```bash
docker exec -it mysql_app mysql -u root -pSUASENHA meu_app -e "SHOW TABLES;"
```

Resultado esperado:
```
+----------------------+
| Tables_in_meu_app    |
+----------------------+
| autenticacoes        |
| backup_agendamentos  |
| historico_senhas     |
| sistemas             |
| usuarios             |
+----------------------+
```

### Passo 4 — Criar o usuário administrador

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

### Passo 5 — Acessar a aplicação

```
# na mesma máquina
https://localhost

# de outra máquina na rede
https://IP_DO_SERVIDOR
```

> O browser exibirá um aviso de certificado auto-assinado. Clique em **Avançar** → **Ir para o site**. Isso é esperado em redes locais com certificado auto-assinado.

### Passo 6 — (Opcional) Subir os apps-fake

Para testar a integração com sistemas externos, abra terminais extras e execute:

```bash
node sistemas-fake/sistema-financeiro.js   # porta 4000
node sistemas-fake/sistema-medico.js       # porta 4001
```

> Os apps-fake simulam sistemas externos que respondem consultas do SecureApp com os níveis de acesso dos usuários.

---

## Primeiro acesso

Faça login com as credenciais iniciais do admin:

```
Username: admin
Senha:    Admin@12345!
```

> ⚠️ **Troque a senha imediatamente após o primeiro login!**
> Acesse: Usuários → Editar → Nova Senha

### Política de senha obrigatória

| Critério | Exemplo |
|---|---|
| Mínimo 10 caracteres | `MinhaSenh@2026` (14 chars) ✅ |
| Pelo menos uma maiúscula | `M` ✅ |
| Pelo menos uma minúscula | `inha` ✅ |
| Pelo menos um número | `2026` ✅ |
| Pelo menos um caractere especial | `@` ✅ |
| Diferente das 3 últimas senhas | verificado automaticamente ✅ |

---

## Variáveis de ambiente

### `.env` da raiz (Docker Compose)

| Variável | Descrição | Quem lê |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | Senha do root do MySQL | Docker Compose → MySQL |
| `MYSQL_ROOT_USER` | Usuário do MySQL | Docker Compose → MySQL |
| `MYSQL_DATABASE` | Nome do banco de dados | Docker Compose → MySQL |
| `JWT_SECRET` | Chave secreta para tokens JWT | Docker Compose → backend |

### `backend/.env` (Node.js)

| Variável | Desenvolvimento local | Docker |
|---|---|---|
| `DB_HOST` | `localhost` | sobrescrito para `mysql` pelo docker-compose.yml |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | `root` | `root` |
| `DB_PASSWORD` | mesma do `.env` raiz | mesma do `.env` raiz |
| `DB_NAME` | `meu_app` | `meu_app` |
| `JWT_SECRET` | mesma do `.env` raiz | mesma do `.env` raiz |
| `PORT` | `3000` | `3000` |
| `TZ` | `America/Recife` | `America/Recife` |

---

## Banco de dados

### Tabelas

**`usuarios`** — dados dos usuários do sistema
```
id                → identificador único (auto increment)
username          → nome de usuário (único)
email             → email (único) — usado como chave na integração com sistemas externos
password_hash     → senha armazenada como hash bcrypt
role              → perfil: 'admin' ou 'user'
tentativas_falhas → contador de tentativas de login falhas
bloqueado_ate     → data/hora de desbloqueio (null = não bloqueado)
criado_em         → data de cadastro
```

**`historico_senhas`** — últimas 3 senhas de cada usuário
```
id            → identificador único
usuario_id    → referência ao usuário (FK)
password_hash → hash da senha anterior
criado_em     → data em que foi usada
```

**`backup_agendamentos`** — agendamentos de backup
```
id             → identificador único
cron_expressao → expressão cron gerada pela interface visual
descricao      → descrição legível
tipo           → 'recorrente' ou 'eventual'
ativo          → 1 = ativo, 0 = pausado
ultimo_backup  → data/hora do último backup executado
criado_em      → data de criação do agendamento
```

**`sistemas`** — sistemas externos integrados
```
id        → identificador único
nome      → nome do sistema (ex: Sistema Financeiro)
url       → URL do endpoint de acessos (ex: http://192.168.1.x:4000/acessos)
api_key   → chave gerada pelo SecureApp para autenticar a consulta
ativo     → 1 = ativo, 0 = desativado
criado_em → data de cadastro
```

**`autenticacoes`** — histórico de autenticações via sistemas externos
```
id             → identificador único
usuario_id     → referência ao usuário (FK)
sistema_id     → referência ao sistema (FK)
ip_origem      → IP de onde partiu a requisição
autenticado_em → data/hora da autenticação
```

### Recriar o banco do zero

```bash
# com Docker
docker exec -i mysql_app mysql -u root -pSUASENHA meu_app < backend/banco.sql

# sem Docker (desenvolvimento local)
mysql -u root -p meu_app < backend/banco.sql
```

---

## Endpoints da API

> Endpoints com `✅ JWT` leem o token do **cookie HttpOnly** enviado automaticamente pelo browser. O fallback para o header `Authorization: Bearer TOKEN` existe para sistemas externos que não usam cookies.

### Autenticação

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| POST | `/auth/login` | Fazer login — define cookie JWT | ❌ |
| POST | `/auth/logout` | Logout — apaga o cookie JWT | ✅ JWT |
| GET | `/auth/me` | Retorna dados do usuário logado | ✅ JWT |
| POST | `/auth/verificar-token` | Valida token — usado por sistemas externos | ✅ api_key |

> ℹ️ O `/auth/login` não exige token por design — é exatamente ele que gera o token. Proteções: bloqueio após 5 falhas, Fail2Ban no SSH, HTTPS e bcrypt no banco.

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
| PUT | `/usuarios/:id` | Editar dados/senha | ✅ JWT |
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

### Sistemas Integrados

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/sistemas` | Listar sistemas | ✅ Admin |
| POST | `/sistemas` | Cadastrar sistema | ✅ Admin |
| PUT | `/sistemas/:id` | Editar sistema | ✅ Admin |
| DELETE | `/sistemas/:id` | Excluir sistema | ✅ Admin |
| GET | `/sistemas/:id/status` | Verificar se está online | ✅ Admin |
| GET | `/sistemas/acessos/:email` | Consultar acessos do usuário em todos os sistemas (pull em tempo real) | ✅ JWT |

### Logs

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/logs` | Ver todos os logs | ✅ Admin |
| GET | `/logs/erros` | Ver apenas erros | ✅ Admin |

### Health Check

| Método | Endpoint | Descrição | Protegido |
|---|---|---|---|
| GET | `/health` | Status do servidor | ❌ |

> ℹ️ O `/health` retorna apenas `{ "status": "servidor rodando" }`. Não expõe dados do banco nem configurações internas.

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

| Evento | Nível |
|---|---|
| Cadastro de usuário | INFO |
| Alteração de dados/senha | INFO |
| Exclusão de usuário | INFO |
| Falha de autenticação | WARN |
| Bloqueio após 5 falhas | WARN |
| Login bem-sucedido | INFO |
| Logout | INFO |
| Backup realizado | INFO |
| Restore realizado | INFO |
| Agendamento de backup criado | INFO |
| Autenticação via sistema externo | INFO |
| Sistema externo não respondeu | WARN |

### Visualizar logs via terminal

```bash
# acompanhar em tempo real
docker exec -it backend_app tail -f /app/logs/app.log

# ver últimas 100 linhas
docker exec -it backend_app tail -n 100 /app/logs/app.log

# copiar para a máquina local
docker cp backend_app:/app/logs/app.log ./app.log
docker cp backend_app:/app/logs/erros.log ./erros.log
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

A interface visual elimina a necessidade de digitar expressão cron:

**Backup Recorrente:**
```
1. Selecione o(s) dia(s) da semana (checkboxes: Seg, Ter, Qua...)
2. Selecione o horário (selects de hora e minuto)
3. Clique em "Agendar Backup Recorrente"
   → o JavaScript gera a expressão cron automaticamente
   Ex: Segunda + 03:00 → cron: "0 3 * * 1"
   Ex: Seg e Qua + 14:00 → cron: "0 14 * * 1,3"
```

**Backup Eventual:**
```
1. Selecione a data no campo de data (calendário nativo do browser)
2. Selecione o horário
3. Marque "Repetir mensalmente" se desejar
4. Clique em "Agendar Backup Eventual"
   Ex: 15/05 + 14:00           → cron: "0 14 15 5 *" (executa uma vez)
   Ex: 15/05 + 14:00 + repetir → cron: "0 14 15 * *" (todo mês no dia 15)
```

> Os agendamentos são persistidos no banco e reativados automaticamente quando o servidor reinicia. Backups eventuais sem repetição são removidos do banco após executar.

### Restore

```
1. Acesse o menu Backup
2. Selecione o arquivo na lista "Restaurar Backup"
3. Confirme a operação (confirmação dupla)
```

> ⚠️ O restore sobrescreve **TODOS** os dados atuais do banco.

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

## Sistemas Integrados

O SecureApp funciona como microsserviço de autenticação. Sistemas externos consultam o SecureApp para validar tokens JWT e o SecureApp consulta os sistemas externos para mostrar o nível de acesso de cada usuário.

### Arquitetura (Modelo B — Pull em tempo real)

```
Sistema externo valida token:
  POST /auth/verificar-token
  Header: x-api-key: CHAVE_DO_SISTEMA
  Body: { token: "JWT_DO_USUARIO" }
  → SecureApp confirma identidade: { valido: true, usuario: { id, username, email } }
  → Sistema externo decide internamente o que o usuário pode fazer

SecureApp consulta nível de acesso:
  Quando o admin abre o perfil de um usuário, o SecureApp faz:
  GET {url_do_sistema}/acessos?email=X
  Header: x-api-key: CHAVE_GERADA_PELO_SECUREAPP
  → Sistema responde: { email: "X", nivel: "Gerente" }
  → SecureApp exibe o resultado — sempre em tempo real, sem cache
```

### Cadastrando um sistema

```
1. Acesse o menu Sistemas
2. Clique em "Novo Sistema"
3. Informe o nome e a URL do endpoint de acessos
   Ex: http://192.168.1.x:4000/acessos
4. Clique em "Cadastrar Sistema"
5. ⚠️ Copie a api_key gerada — ela é exibida UMA ÚNICA VEZ
6. Passe a api_key ao administrador do sistema externo para configurar o endpoint
```

### Apps-fake para demonstração

Os apps-fake em `sistemas-fake/` simulam sistemas externos com dados hardcoded:

```bash
node sistemas-fake/sistema-financeiro.js   # porta 4000
node sistemas-fake/sistema-medico.js       # porta 4001
```

Cada app-fake expõe `GET /acessos?email=X`, valida a `x-api-key` antes de responder e loga no terminal cada consulta recebida — útil para demonstrar ao vivo que o dado partiu do sistema externo.

---

## Endpoint Protection

Ferramentas instaladas na VM Debian de produção:

### UFW — Firewall

Bloqueia todo tráfego de entrada por padrão, liberando apenas as portas necessárias.

```bash
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (redirecionado para HTTPS pelo Nginx)
sudo ufw allow 443   # HTTPS
sudo ufw enable

# verificar
sudo ufw status verbose
```

### Fail2Ban — Bloqueio de força bruta

Monitora `/var/log/auth.log` e bane automaticamente IPs com múltiplas falhas de login SSH (jail `sshd` ativa).

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# verificar
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### ClamAV — Antivírus

Scan agendado diariamente às 03:00, com logs por data e limpeza automática de logs antigos.

```bash
sudo apt install clamav clamav-daemon -y
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl enable clamav-freshclam clamav-daemon
sudo systemctl start clamav-freshclam clamav-daemon

# verificar
sudo systemctl status clamav-daemon

# agendar scan diário
sudo crontab -e
```

Adicionar no crontab:
```bash
# scan diário às 03:00 com log por data
0 3 * * * clamscan /home/ -r --log=/var/log/clamav/scan-$(date +\%Y-\%m-\%d).log

# limpeza de logs com mais de 30 dias às 03:30
30 3 * * * find /var/log/clamav/ -name 'scan-*.log' -mtime +30 -delete
```

### Verificar todos os serviços

```bash
sudo systemctl status ufw fail2ban clamav-daemon clamav-freshclam
```

---

## Migração para produção — VM Debian

### 1. Instalar o Docker na VM

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) \
  signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker

docker -v
docker compose version
```

### 2. Transferir o projeto

Via WinSCP (interface gráfica) ou SCP (terminal):

```bash
# do Windows para a VM
scp -r ./meu-app usuario@IP_DA_VM:/home/usuario/
```

### 3. Configurar e subir na VM

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

# confirmar config.js apontando para Docker
# frontend/js/config.js → const API_URL = '/api'

# subir os containers
docker compose up -d --build

# criar tabelas
docker exec -i mysql_app mysql -u root -pSUASENHA meu_app < backend/banco.sql

# criar admin
docker exec -it backend_app node scripts/criarAdmin.js
```

### 4. Acessar

```
https://IP_DA_VM
# ou IP correspondente ao seu servidor
```

---

## Scripts úteis

### Gerenciar containers

```bash
docker compose up -d              # subir todos
docker compose up -d --build      # subir e reconstruir imagens
docker compose down               # parar (mantém volumes/dados)
docker compose down --volumes     # parar e apagar TODOS os dados ⚠️
docker compose restart backend    # reiniciar um container específico
docker compose ps                 # ver status
```

### Ver logs dos containers

```bash
docker compose logs -f            # todos os containers
docker compose logs -f backend    # só o backend
docker compose logs -f mysql      # só o MySQL
docker compose logs -f frontend   # só o Nginx
```

### Gerenciar o banco

```bash
# acessar o MySQL interativamente
docker exec -it mysql_app mysql -u root -pSUASENHA meu_app

# recriar as tabelas
docker exec -i mysql_app mysql -u root -pSUASENHA meu_app < backend/banco.sql

# recriar o admin
docker exec -it backend_app node scripts/criarAdmin.js
```

### Gerenciar volumes e dados

```bash
docker volume ls
docker volume inspect meu-app_mysql_data

# backups
docker exec -it backend_app ls -lh /app/backups/
docker cp backend_app:/app/backups/ARQUIVO.sql ./

# logs
docker cp backend_app:/app/logs/app.log ./app.log
docker cp backend_app:/app/logs/erros.log ./erros.log
```

### Reconstruir do zero

```bash
docker compose down
docker compose build --no-cache backend
docker compose build --no-cache frontend
docker compose up -d
```

---

## Problemas comuns

### Erro: `Access denied for user ''@'...'`
```
Causa:   arquivo .env não encontrado ou DB_PASSWORD incorreta
Solução: verificar se backend/.env existe e se DB_PASSWORD bate com MYSQL_ROOT_PASSWORD
         verificar se não há espaços ao redor do = nas variáveis
```

### Erro: `Cannot connect to database` ou `ECONNREFUSED`
```
Causa:   MySQL ainda não terminou de inicializar
Solução: aguardar 20–30 segundos e tentar novamente
         verificar: docker compose logs mysql
```

### Frontend não consegue chamar a API em desenvolvimento local
```
Causa:   config.js com API_URL = '/api' ao invés de 'http://localhost:3000'
Solução: frontend/js/config.js → const API_URL = 'http://localhost:3000'
```

### Frontend não consegue chamar a API no Docker
```
Causa:   config.js com API_URL = 'http://localhost:3000' ao invés de '/api'
Solução: frontend/js/config.js → const API_URL = '/api'
```

### Erro no backup: `mysqldump: unknown variable ssl-mode`
```
Causa:   Dockerfile usando imagem Alpine com cliente MariaDB (incompatível)
Solução: verificar se o Dockerfile do backend usa:
           FROM node:20-bookworm-slim
           RUN apt-get install -y default-mysql-client
```

### Browser bloqueia o HTTPS com erro de certificado
```
Causa:   certificado auto-assinado não reconhecido pelo browser
Solução: clicar em "Avançar" → "Ir para o site (não seguro)"
         isso é esperado para certificados auto-assinados em rede local
```

### Porta 80 ou 443 já está em uso
```
Causa:   outro serviço usando a mesma porta
Solução: parar o serviço conflitante
         verificar no Windows: netstat -ano | findstr :443
         verificar no Linux:   sudo lsof -i :443
```

### Container backend para imediatamente após iniciar
```
Causa:   variável de ambiente faltando ou erro no código
Solução: docker compose logs backend
         verificar se todas as variáveis do backend/.env estão preenchidas
```

### Agendamento de backup não executa após reinício do servidor
```
Causa:   isso NÃO deveria ocorrer — recarregarAgendamentos() recria os jobs automaticamente
Solução: se ocorrer, verificar: docker compose logs backend
         confirmar que backup_agendamentos tem registros com ativo = 1
```

### Sistema integrado aparece como offline
```
Causa:   app-fake não está rodando, URL incorreta no cadastro ou api_key errada
Solução: verificar se o app-fake está rodando na porta correta
         verificar a URL cadastrada em Sistemas
         o app-fake loga no terminal cada consulta recebida
```

---

## Git — o que sobe e o que não sobe

`.gitignore` configurado:

```
node_modules/       # dependências — pesado, reinstalável com npm install
.env                # variáveis de ambiente — NUNCA subir
backend/.env        # variáveis de ambiente — NUNCA subir
ssl/cert.key        # chave privada SSL — NUNCA subir
backend/logs/       # logs gerados pela aplicação
backend/backups/    # backups gerados pela aplicação
.DS_Store
Thumbs.db
```

| Arquivo/Pasta | Sobe? | Motivo |
|---|---|---|
| `frontend/` | ✅ | código-fonte |
| `backend/` | ✅ | código-fonte |
| `sistemas-fake/` | ✅ | código-fonte |
| `nginx.conf` | ✅ | configuração |
| `docker-compose.yml` | ✅ | configuração |
| `README.md` | ✅ | documentação |
| `.env.example` | ✅ | modelo público sem valores reais |
| `backend/.env.example` | ✅ | modelo público sem valores reais |
| `ssl/cert.crt` | ✅ | certificado público — ok subir |
| `.env` | ❌ | contém senhas reais |
| `backend/.env` | ❌ | contém senhas reais |
| `ssl/cert.key` | ❌ | chave privada |
| `node_modules/` | ❌ | pesado — reinstalar com `npm install` |
| `backend/logs/` | ❌ | gerado em execução |
| `backend/backups/` | ❌ | gerado em execução |

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
