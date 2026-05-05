// ===================================================
// IMPORTAÇÕES
// ===================================================

const router = require('express').Router()
const db = require('../database')
const { validarSenha, gerarHash, senhaJaUsada } = require('../utils/senha')
const logger = require('../utils/logger')
const { verificarToken, verificarAdmin } = require('../middleware/auth')

// ===================================================
// GET /usuarios
// listar todos os usuários
// apenas admin pode ver a lista completa
// ===================================================

router.get('/', verificarToken, async (req, res) => {
  try {

    // busca todos os usuários
    // não retornamos o password_hash por segurança
    // nunca devolvemos a senha para o frontend
    // mesmo sendo hash, é desnecessário expor
    const [usuarios] = await db.query(`
      SELECT 
        id,
        username,
        email,
        role,
        tentativas_falhas,
        bloqueado_ate,
        criado_em
      FROM usuarios
      ORDER BY criado_em DESC
    `)

    res.json({ usuarios })

  } catch (erro) {
    logger.error(`Erro ao listar usuários: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// GET /usuarios/:id
// buscar um usuário específico
// usuário comum só pode ver a si mesmo
// admin pode ver qualquer um
// ===================================================

router.get('/:id', verificarToken, async (req, res) => {
  try {

    // req.params.id vem da URL
    // ex: GET /usuarios/3 → req.params.id = "3"
    const { id } = req.params

    const [rows] = await db.query(`
      SELECT 
        id,
        username,
        email,
        role,
        tentativas_falhas,
        bloqueado_ate,
        criado_em
      FROM usuarios
      WHERE id = ?
    `, [id])

    // se não encontrou nenhum resultado
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' })
    }

    res.json({ usuario: rows[0] })

  } catch (erro) {
    logger.error(`Erro ao buscar usuário: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// POST /usuarios
// cadastrar novo usuário
// apenas admin pode cadastrar
// ===================================================

router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { username, email, password, role } = req.body

    // -----------------------------------------------
    // VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS
    // -----------------------------------------------

    if (!username || !email || !password) {
      return res.status(400).json({
        erro: 'Username, email e senha são obrigatórios.'
      })
    }

    // -----------------------------------------------
    // VALIDAÇÃO DA POLÍTICA DE SENHA — requisito 4.1, 4.2, 4.3
    // -----------------------------------------------

    const validacao = validarSenha(password)
    if (!validacao.valida) {
      return res.status(400).json({
        erro: 'Senha inválida.',
        detalhes: validacao.erros
      })
    }

    // -----------------------------------------------
    // VERIFICA SE USERNAME OU EMAIL JÁ EXISTEM
    // -----------------------------------------------

    const [existente] = await db.query(
      'SELECT id FROM usuarios WHERE username = ? OR email = ?',
      [username, email]
    )

    if (existente.length > 0) {
      return res.status(400).json({
        erro: 'Username ou email já cadastrado.'
      })
    }

    // -----------------------------------------------
    // GERA O HASH DA SENHA — requisito 4.6
    // -----------------------------------------------

    const hash = await gerarHash(password)

    // -----------------------------------------------
    // INSERE O USUÁRIO NO BANCO
    // -----------------------------------------------

    // role padrão é 'user' se não for informado
    const roleDefinido = role === 'admin' ? 'admin' : 'user'

    const [resultado] = await db.query(
      'INSERT INTO usuarios (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hash, roleDefinido]
    )

    // resultado.insertId é o id gerado automaticamente
    // pelo AUTO_INCREMENT para o novo registro
    const novoId = resultado.insertId

    // -----------------------------------------------
    // SALVA NO HISTÓRICO DE SENHAS — requisito 4.4
    // -----------------------------------------------

    await db.query(
      'INSERT INTO historico_senhas (usuario_id, password_hash) VALUES (?, ?)',
      [novoId, hash]
    )

    // requisito 3.1 — log de cadastro
    logger.logCadastroUsuario(username)

    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso.',
      id: novoId
    })

  } catch (erro) {
    logger.error(`Erro ao cadastrar usuário: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// PUT /usuarios/:id
// editar usuário
// usuário comum só pode editar a si mesmo
// admin pode editar qualquer um
// ===================================================

router.put('/:id', verificarToken, async (req, res) => {
  try {

    const { id } = req.params
    const { username, email, password, role } = req.body

    // verifica permissão
    if (req.usuario.role !== 'admin' && req.usuario.id !== parseInt(id)) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }

    // verifica se o usuário existe
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' })
    }

    const usuario = rows[0]

    // -----------------------------------------------
    // ATUALIZA DADOS BÁSICOS
    // -----------------------------------------------

    // usa os novos valores se vieram, senão mantém os atuais
    const novoUsername = username || usuario.username
    const novoEmail = email || usuario.email

    // só admin pode mudar o role
    const novoRole = (req.usuario.role === 'admin' && role)
      ? role
      : usuario.role

    await db.query(
      'UPDATE usuarios SET username = ?, email = ?, role = ? WHERE id = ?',
      [novoUsername, novoEmail, novoRole, id]
    )

    // requisito 3.2 — log de alteração de dados
    logger.logAlteracaoUsuario(novoUsername, 'dados cadastrais')

    // -----------------------------------------------
    // ATUALIZA SENHA SE FOI ENVIADA
    // -----------------------------------------------

    if (password) {

      // valida a política de senha
      const validacao = validarSenha(password)
      if (!validacao.valida) {
        return res.status(400).json({
          erro: 'Senha inválida.',
          detalhes: validacao.erros
        })
      }

      // busca as últimas 3 senhas do histórico — requisito 4.4
      const [historico] = await db.query(`
        SELECT password_hash 
        FROM historico_senhas 
        WHERE usuario_id = ? 
        ORDER BY criado_em DESC 
        LIMIT 3
      `, [id])

      // extrai só os hashes em um array simples
      // ex: ['$2a$12$...', '$2a$12$...', '$2a$12$...']
      const hashes = historico.map(h => h.password_hash)

      // verifica se a nova senha já foi usada
      const jaUsada = await senhaJaUsada(password, hashes)
      if (jaUsada) {
        return res.status(400).json({
          erro: 'A nova senha não pode ser igual às 3 últimas senhas utilizadas.'
        })
      }

      // gera o novo hash e atualiza
      const novoHash = await gerarHash(password)

      await db.query(
        'UPDATE usuarios SET password_hash = ? WHERE id = ?',
        [novoHash, id]
      )

      // insere no histórico de senhas
      await db.query(
        'INSERT INTO historico_senhas (usuario_id, password_hash) VALUES (?, ?)',
        [id, novoHash]
      )

      // mantém apenas as 3 últimas no histórico
      // primeiro busca todos os ids ordenados do mais novo
      const [todoHistorico] = await db.query(`
        SELECT id 
        FROM historico_senhas 
        WHERE usuario_id = ? 
        ORDER BY criado_em DESC
      `, [id])

      // se tiver mais de 3, deleta os mais antigos
      if (todoHistorico.length > 3) {

        // pega os ids que devem ser deletados
        // slice(3) pega do 4º elemento em diante
        const idsParaDeletar = todoHistorico
          .slice(3)
          .map(h => h.id)

        await db.query(
          'DELETE FROM historico_senhas WHERE id IN (?)',
          [idsParaDeletar]
        )
      }

      // requisito 3.2 — log de troca de senha
      logger.logTrocaSenha(novoUsername)
    }

    res.json({ mensagem: 'Usuário atualizado com sucesso.' })

  } catch (erro) {
    logger.error(`Erro ao editar usuário: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// DELETE /usuarios/:id
// excluir usuário
// apenas admin pode excluir
// admin não pode excluir a si mesmo
// ===================================================

router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params

    // admin não pode excluir a si mesmo
    // evita ficar sem nenhum admin no sistema
    if (req.usuario.id === parseInt(id)) {
      return res.status(400).json({
        erro: 'Você não pode excluir sua própria conta.'
      })
    }

    // verifica se o usuário existe
    const [rows] = await db.query(
      'SELECT username FROM usuarios WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' })
    }

    const { username } = rows[0]

    // o ON DELETE CASCADE que definimos no banco
    // garante que o histórico de senhas também
    // será deletado automaticamente junto
    await db.query('DELETE FROM usuarios WHERE id = ?', [id])

    // requisito 3.3 — log de exclusão
    logger.logExclusaoUsuario(username)

    res.json({ mensagem: 'Usuário excluído com sucesso.' })

  } catch (erro) {
    logger.error(`Erro ao excluir usuário: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = router