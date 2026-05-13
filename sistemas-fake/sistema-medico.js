// ===================================================
// SISTEMA MÉDICO — APP FAKE
// Simula um sistema externo integrado ao SecureApp
//
// Responsabilidade:
//   Expor endpoint GET /acessos?email=X
//   que o SecureApp consulta em tempo real
//
// Níveis de acesso deste sistema:
//   Médico, Enfermeiro, Auxiliar, Administrador,
//   Desabilitado — cada sistema tem os seus próprios
//   o SecureApp não precisa conhecê-los
//
// Como usar:
//   node sistema-medico.js
//   Roda na porta 4001
// ===================================================

const express = require('express')
const app = express()

// ===================================================
// CONFIGURAÇÃO
// ===================================================

const PORT = 4001

// api_key gerada pelo SecureApp ao cadastrar este sistema
// substitua pelo valor gerado na tela de Sistemas
const API_KEY = 'sk_6295ecfc-3e71-4296-9341-d59f8583fa9b'

// ===================================================
// BASE DE DADOS INTERNA DO SISTEMA MÉDICO
// níveis específicos deste sistema — diferentes
// do Sistema Financeiro, pois cada sistema tem
// suas próprias regras de negócio
// ===================================================

const acessos = {
  'admin@app.com':      'Administrador',
  'angelo@empresa.com': 'Desabilitado',
  'thais@empresa.com':  'Médico',
  'tulio@empresa.com':  'Enfermeiro',
  'julio@empresa.com':  'Auxiliar'
}

// ===================================================
// MIDDLEWARE — VALIDAÇÃO DA API_KEY
// ===================================================

app.use((req, res, next) => {

  const apiKey = req.headers['x-api-key']

  if (!apiKey || apiKey !== API_KEY) {
    console.log(`[NEGADO] Tentativa sem chave válida de: ${req.ip}`)
    return res.status(401).json({ erro: 'Não autorizado.' })
  }

  next()
})

// ===================================================
// GET /acessos
// ===================================================

app.get('/acessos', (req, res) => {

  const { email } = req.query

  if (!email) {
    return res.status(400).json({ erro: 'Email é obrigatório.' })
  }

  console.log(`[CONSULTA] SecureApp consultou: ${email}`)

  const nivel = acessos[email] || 'desabilitado'

  console.log(`[RESPOSTA] ${email} → ${nivel}`)

  res.json({
    email,
    nivel,
    sistema: 'Sistema Médico'
  })
})

// ===================================================
// INICIALIZAÇÃO
// ===================================================

app.listen(PORT, () => {
  console.log('================================================')
  console.log(`Sistema Médico rodando na porta ${PORT}`)
  console.log(`Endpoint: http://localhost:${PORT}/acessos`)
  console.log('================================================')
})