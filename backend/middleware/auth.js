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

  // o token chega no header 'Authorization' da requisição
  // no formato: "Bearer eyJhbG..."
  // o frontend envia assim:
  //   fetch('/rota', {
  //     headers: { 'Authorization': 'Bearer ' + token }
  //   })
  const authHeader = req.headers['authorization']

  // se não veio nenhum header de autorização
  if (!authHeader) {
    return res.status(401).json({
      erro: 'Acesso negado. Token não fornecido.'
    })
  }

  // separa o "Bearer" do token em si
  // "Bearer eyJhbG...".split(' ') retorna:
  // ["Bearer", "eyJhbG..."]
  // [1] pega o segundo elemento — o token
  const token = authHeader.split(' ')[1]

  // se o header veio mas estava malformado
  // ex: veio só "Bearer" sem o token depois
  if (!token) {
    return res.status(401).json({
      erro: 'Acesso negado. Token malformado.'
    })
  }

  try {

    // jwt.verify faz duas coisas ao mesmo tempo:
    // 1. verifica se o token foi assinado com nossa chave secreta
    //    (garante que não foi falsificado)
    // 2. verifica se o token ainda não expirou
    // se qualquer uma falhar, lança um erro
    // que é capturado pelo catch abaixo
    const dados = jwt.verify(token, process.env.JWT_SECRET)

    // se chegou aqui, o token é válido
    // salvamos os dados do usuário dentro do req
    // para as rotas conseguirem acessar depois
    // ex: em qualquer rota protegida você terá acesso a:
    //   req.usuario.id
    //   req.usuario.username
    //   req.usuario.role
    req.usuario = dados

    // next() libera a requisição para continuar
    // para a rota que estava tentando acessar
    next()

  } catch (erro) {

    // TokenExpiredError — token expirou
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Sessão expirada. Faça login novamente.'
      })
    }

    // JsonWebTokenError — token inválido ou falsificado
    return res.status(401).json({
      erro: 'Token inválido.'
    })
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