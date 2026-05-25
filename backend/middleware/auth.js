// ===================================================
// IMPORTAÇÕES
// ===================================================

// jsonwebtoken — biblioteca para gerar e verificar
// tokens JWT. Um token JWT tem 3 partes separadas por ponto:
// header.payload.signature
// ex: eyJhbG...  .  eyJ1c2Vy...  .  SflKxw...
//     cabeçalho      dados          assinatura
const jwt = require('jsonwebtoken')

// ===================================================
// MIDDLEWARE DE VERIFICAÇÃO DO TOKEN
// ===================================================

function verificarToken(req, res, next) {

  // tenta ler o token do cookie HttpOnly
  // o browser envia automaticamente em toda requisição
  let token = req.cookies.token

  // fallback — se não vier no cookie
  // tenta o header Authorization
  // mantido para compatibilidade com sistemas externos
  // que usam o header (ex: /auth/verificar-token)
  if (!token) {
    const authHeader = req.headers['authorization']
    if (authHeader) {
      token = authHeader.split(' ')[1]
    }
  }

  if (!token) {
    return res.status(401).json({
      erro: 'Acesso negado. Token não fornecido.'
    })
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET)
    req.usuario = dados
    next() //esse next é importante para continuar para a função da rota depois do middleware

  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Sessão expirada. Faça login novamente.'
      })
    }
    return res.status(401).json({ erro: 'Token inválido.' })
  }

}

// ===================================================
// MIDDLEWARE DE VERIFICAÇÃO DE ADMIN
// ===================================================

// esse middleware é usado DEPOIS do verificarToken
// nas rotas que só admin pode acessar
// ex: deletar usuário, ver logs, fazer backup
function verificarAdmin(req, res, next) {

  // nesse ponto req.usuario já existe
  // porque o verificarToken rodou antes
  // e salvou os dados do usuário no req
  if (req.usuario.role !== 'admin') {
    return res.status(403).json({
      erro: 'Acesso negado. Apenas administradores.'
    })
  }

  // é admin — pode continuar
  next()
}

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = { verificarToken, verificarAdmin }