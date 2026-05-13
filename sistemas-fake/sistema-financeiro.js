// ===================================================
// SISTEMA FINANCEIRO — APP FAKE
// Simula um sistema externo integrado ao SecureApp
//
// Responsabilidade:
//   Expor endpoint GET /acessos?email=X
//   que o SecureApp consulta em tempo real
//   para saber o nível de acesso do usuário
//
// Segurança:
//   Valida a api_key no header x-api-key
//   Sem a chave correta retorna 401
//
// Como usar:
//   node sistema-financeiro.js
//   Roda na porta 4000
// ===================================================

const express = require('express')
const app = express()

// ===================================================
// CONFIGURAÇÃO
// ===================================================

const PORT = 4000

// api_key gerada pelo SecureApp ao cadastrar este sistema
// substitua pelo valor gerado na tela de Sistemas
const API_KEY = 'sk_234fb3ab-0368-4261-b2d9-180440c60084'
//'COLE_AQUI_A_API_KEY_GERADA_PELO_SECUREAPP'


// ===================================================
// BASE DE DADOS INTERNA DO SISTEMA FINANCEIRO
// em produção real viria do banco do sistema
// aqui é hardcoded para simular a integração
// chave = email do usuário
// valor = nível de acesso NESTE sistema
// ===================================================

const acessos = {
  'admin@app.com':  'Administrador',
  'angelo@empresa.com': 'Gerente',
  'thais@empresa.com':  'Auditora',
  'tulio@empresa.com':  'Contador',
  'julio@empresa.com':  'Desabilitado'
}

// ===================================================
// MIDDLEWARE — VALIDAÇÃO DA API_KEY
// aplicado em todas as rotas
// garante que só o SecureApp consegue consultar
// ===================================================

app.use((req, res, next) => {

  const apiKey = req.headers['x-api-key']

  // se não veio chave ou chave incorreta — rejeita
  if (!apiKey || apiKey !== API_KEY) {
    console.log(`[NEGADO] Tentativa sem chave válida de: ${req.ip}`)
    return res.status(401).json({ erro: 'Não autorizado.' })
  }

  // chave correta — prossegue
  next()
})

// ===================================================
// GET /acessos
// retorna o nível de acesso de um usuário
// consultado pelo SecureApp via email
// ===================================================

app.get('/acessos', (req, res) => {

  const { email } = req.query

  if (!email) {
    return res.status(400).json({ erro: 'Email é obrigatório.' })
  }

  // log da consulta — útil para demonstrar ao avaliador
  // que a requisição chegou neste sistema
  console.log(`[CONSULTA] SecureApp consultou: ${email}`)

  // busca o nível de acesso do usuário
  // se não encontrar retorna 'desabilitado'
  // não revelamos se o email existe ou não
  // por questão de segurança
  const nivel = acessos[email] || 'desabilitado'

  console.log(`[RESPOSTA] ${email} → ${nivel}`)

  res.json({
    email,
    nivel,
    sistema: 'Sistema Financeiro'
  })
})

// ===================================================
// INICIALIZAÇÃO
// ===================================================

app.listen(PORT, () => {
  console.log('================================================')
  console.log(`Sistema Financeiro rodando na porta ${PORT}`)
  console.log(`Endpoint: http://localhost:${PORT}/acessos`)
  console.log('================================================')
})