// ===================================================
// IMPORTAÇÕES
// ===================================================

// dotenv — lê o arquivo .env e disponibiliza as
// variáveis em process.env (ex: process.env.PORT)
// deve ser a primeira importação sempre
require('dotenv').config()

// express — o framework do servidor web
const express = require('express')

// cors — permite que o frontend (outra origem/porta) consiga chamar o backend sem ser bloqueado pelo browser
const cors = require('cors')

// path — módulo nativo do Node para lidar com caminhos de pasta de forma segura no Windows e Linux
const path = require('path')

const db = require('./database')

const logger = require('./utils/logger')

const authRoutes = require('./routes/auth')

const usuariosRoutes = require('./routes/usuarios')

// backup exporta um objeto { router, recarregarAgendamentos } por isso a desestruturação aqui é diferente dos outros
const { router: backupRoutes, recarregarAgendamentos } = require('./routes/backup')

const logsRoutes = require('./routes/logs')

// criamos a aplicação express
const app = express()

// ===================================================
// CONFIGURAÇÕES
// ===================================================

// habilita o cors para todas as origens em produção você limitaria para o domínio do frontend
app.use(cors())

// permite que o express leia o corpo das requisições no formato JSON — sem isso req.body vem undefined
app.use(express.json())

// lê a porta do .env, ou usa 3000 como padrão
const PORT = process.env.PORT || 3000

// ===================================================
// ROTAS
// ===================================================

// rota de teste — útil para verificar se o servidor está rodando antes de implementar as rotas reais
app.get('/health', (req, res) => {
  res.json({ status: 'servidor rodando' })
})

// as demais rotas serão registradas aqui conforme formos criando cada arquivo

// ===================================================
// AUTENTICAÇÃO
// ===================================================
// registra as rotas de autenticação
// todas as rotas do arquivo auth.js ficam prefixadas com /auth
// ex: router.post('/login') vira POST /auth/login
//     router.post('/logout') vira POST /auth/logout
app.use('/auth', authRoutes)

// ===================================================
// USUÁRIOS
// ===================================================
// registra as rotas de usuários
// todas as rotas do arquivo usuarios.js ficam prefixadas com /usuarios
// ex: router.get('/') vira GET /usuarios
//     router.post('/') vira POST /usuarios
app.use('/usuarios', usuariosRoutes)

//----------------------------------------
app.use('/backup', backupRoutes)

//----------------------------------------
app.use('/logs', logsRoutes)

// ===================================================
// INICIALIZAÇÃO DO SERVIDOR
// ===================================================

app.listen(PORT, () => {
  //console.log(`Servidor rodando em http://localhost:${PORT}`)
  logger.info(`Servidor rodando em http://localhost:${PORT}`)

  // recarrega os agendamentos salvos no banco
  // após o servidor estar pronto para receber requisições
  recarregarAgendamentos()
})
//Se executar "node server.js" no terminal, o servidor vai subir e mostrar a mensagem acima
//Se executar "node server.js", devido const db = require('./database'), o arquivo database.js vai ser carregado, e a função testarConexao() vai ser chamada, testando a conexão com o banco de dados. Se a conexão for bem-sucedida, vai mostrar "Banco de dados conectado com sucesso!" no terminal. Se houver um erro, vai mostrar a mensagem de erro e encerrar o processo.
//Se No browser acessar: "http://localhost:3000/health" deve mostrar: {"status":"servidor rodando"}

