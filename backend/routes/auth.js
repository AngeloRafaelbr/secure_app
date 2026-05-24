// ===================================================
// IMPORTAÇÕES
// ===================================================

// express.Router() — permite criar rotas em arquivos
// separados e depois registrar no server.js
// ao invés de tudo ficar junto no server.js
const router = require('express').Router()

// importa o pool de conexão com o banco
const db = require('../database')

// importa as funções de senha que criamos
const { compararSenha } = require('../utils/senha')

// importa o logger com as funções de eventos
const logger = require('../utils/logger')

// importa o middleware de verificação do token
const { verificarToken } = require('../middleware/auth')

// jsonwebtoken para gerar o token no login
const jwt = require('jsonwebtoken')

// ===================================================
// CONSTANTES
// ===================================================

// número máximo de tentativas antes de bloquear
const MAX_TENTATIVAS = 5

// tempo de bloqueio em minutos
const TEMPO_BLOQUEIO = 10

// ===================================================
// POST /auth/login
// ===================================================

router.post('/login', async (req, res) => {

  // desestrutura o body da requisição
  // o frontend enviará:
  // { "username": "joao", "password": "MinhaSenh@123" }
  const { username, password } = req.body

  // validação básica — campos obrigatórios
  if (!username || !password) {
    return res.status(400).json({
      erro: 'Username e senha são obrigatórios.'
    })
  }

  try {

    // -----------------------------------------------
    // BUSCA O USUÁRIO NO BANCO
    // -----------------------------------------------

    // busca o usuário pelo username
    // db.query retorna um array com dois elementos:
    // [rows, fields] — rows são os resultados
    // fields são as informações das colunas (não usamos)
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE username = ?',
      [username]
    )

    // rows é um array — se vier vazio, usuário não existe
    // usamos a mesma mensagem de "usuário ou senha inválidos"
    // para não revelar se o usuário existe ou não
    // isso é uma boa prática de segurança
    if (rows.length === 0) {
      logger.logFalhaLogin(username)
      return res.status(401).json({
        erro: 'Usuário ou senha inválidos.'
      })
    }

    // pega o primeiro (e único) resultado
    const usuario = rows[0]

    // -----------------------------------------------
    // VERIFICA SE ESTÁ BLOQUEADO — requisito 4.5
    // -----------------------------------------------

    if (usuario.bloqueado_ate) {

      const agora = new Date()
      const bloqueadoAte = new Date(usuario.bloqueado_ate)

      // se o horário de bloqueio ainda não passou
      if (agora < bloqueadoAte) {
        // calcula quantos minutos faltam para desbloquear
        const minutosRestantes = Math.ceil(
          (bloqueadoAte - agora) / 1000 / 60
        )

        return res.status(401).json({
          erro: `Usuário bloqueado. Tente novamente em ${minutosRestantes} minuto(s).`
        })
      }

      // bloqueio expirou — reseta os campos
      await db.query(
        'UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?',
        [usuario.id]
      )

      // atualiza o objeto local também
      usuario.tentativas_falhas = 0
      usuario.bloqueado_ate = null
    }

    // -----------------------------------------------
    // VERIFICA A SENHA — requisito 4.6
    // -----------------------------------------------

    const senhaCorreta = await compararSenha(password, usuario.password_hash)

    if (!senhaCorreta) {

      // incrementa o contador de tentativas falhas
      const novasTentativas = usuario.tentativas_falhas + 1

      logger.logFalhaLogin(username)

      // chegou no limite — bloqueia o usuário
      if (novasTentativas >= MAX_TENTATIVAS) {

        // calcula o momento exato do desbloqueio
        const bloqueadoAte = new Date(
          Date.now() + TEMPO_BLOQUEIO * 60 * 1000
        )

        await db.query(
          'UPDATE usuarios SET tentativas_falhas = ?, bloqueado_ate = ? WHERE id = ?',
          [novasTentativas, bloqueadoAte, usuario.id]
        )

        // requisito 3.5 — log de bloqueio
        logger.logUsuarioBloqueado(username)

        return res.status(401).json({
          erro: `Usuário bloqueado por ${TEMPO_BLOQUEIO} minutos após ${MAX_TENTATIVAS} tentativas falhas.`
        })
      }

      // ainda não atingiu o limite — só incrementa
      await db.query(
        'UPDATE usuarios SET tentativas_falhas = ? WHERE id = ?',
        [novasTentativas, usuario.id]
      )

      return res.status(401).json({
        erro: `Usuário ou senha inválidos. Tentativa ${novasTentativas} de ${MAX_TENTATIVAS}.`
      })
    }

    // -----------------------------------------------
    // LOGIN BEM SUCEDIDO
    // -----------------------------------------------

    // reseta o contador de tentativas falhas
    await db.query(
      'UPDATE usuarios SET tentativas_falhas = 0, bloqueado_ate = NULL WHERE id = ?',
      [usuario.id]
    )

    // gera o token JWT com os dados do usuário
    // esses dados ficam dentro do token e podem ser
    // lidos pelo middleware sem consultar o banco
    const token = jwt.sign(
      {
        id: usuario.id,
        username: usuario.username,
        role: usuario.role
      },
      // chave secreta do .env para assinar o token
      process.env.JWT_SECRET,
      {
        // token expira em 8 horas
        // após isso o usuário precisa fazer login novamente
        expiresIn: '8h'
      }
    )

    // requisito 3.6 — log de login bem sucedido
    logger.logLoginSucesso(username)

    // responde com o token e dados básicos do usuário
    // o frontend salvará o token no localStorage
    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        role: usuario.role
      }
    })

  } catch (erro) {
    logger.error(`Erro no login: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// POST /auth/logout
// ===================================================

// rota protegida — precisa de token válido
// verificarToken roda antes da função da rota
router.post('/logout', verificarToken, (req, res) => {

  // req.usuario foi preenchido pelo verificarToken
  // com os dados que estavam dentro do token
  logger.logLogout(req.usuario.username)

  // o JWT não tem "invalidar token" no servidor
  // o frontend é responsável por apagar o token
  // do localStorage ao receber essa resposta
  res.json({ mensagem: 'Logout realizado com sucesso.' })
})

// ===================================================
// POST /auth/verificar-token
// endpoint usado pelos sistemas externos para
// validar se um token JWT é válido
// identifica o usuário e registra a autenticação
// ===================================================

router.post('/verificar-token', async (req, res) => {
  try {

    // o sistema externo envia o token no header
    const authHeader = req.headers['authorization']

    if (!authHeader) {
      return res.status(401).json({ valido: false, erro: 'Token não fornecido.' })
    }

    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ valido: false, erro: 'Token malformado.' })
    }

    // verifica o token usando a chave secreta
    const dados = jwt.verify(token, process.env.JWT_SECRET)

    // busca o usuário atualizado no banco
    const [rows] = await db.query(
      'SELECT id, username, email, role FROM usuarios WHERE id = ?',
      [dados.id]
    )

    if (rows.length === 0) {
      return res.status(401).json({ valido: false, erro: 'Usuário não encontrado.' })
    }

    const usuario = rows[0]

    // identifica qual sistema está verificando o token
    // pelo header x-api-key
    const apiKey = req.headers['x-api-key']

    if (apiKey) {
      const [sistemas] = await db.query(
        'SELECT id, nome FROM sistemas WHERE api_key = ? AND ativo = 1',
        [apiKey]
      )

      // registra a autenticação no histórico
      // apenas se o sistema for reconhecido
      if (sistemas.length > 0) {
        await db.query(
          'INSERT INTO autenticacoes (usuario_id, sistema_id, ip_origem) VALUES (?, ?, ?)',
          [
            usuario.id,
            sistemas[0].id,
            req.ip || req.connection.remoteAddress
          ]
        )

        logger.logTokenVerificado(
          usuario.username,
          nomeSistema[0]?.nome || 'desconhecido'
        )

      }
    }

    res.json({
      valido: true,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        role: usuario.role
      }
    })

  } catch (erro) {
    // TokenExpiredError ou JsonWebTokenError
    res.status(401).json({ valido: false, erro: 'Token inválido ou expirado.' })
  }
})

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = router