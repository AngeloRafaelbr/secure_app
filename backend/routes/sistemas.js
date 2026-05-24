// ===================================================
// SISTEMAS.JS
// Gerenciamento dos sistemas integrados ao SecureApp
// Responsabilidades:
//   - CRUD de sistemas externos
//   - Geração de api_key para autenticação
//   - Consulta em tempo real dos acessos por usuário
// ===================================================

const router = require('express').Router()
const db = require('../database')
const logger = require('../utils/logger')
const { verificarToken, verificarAdmin } = require('../middleware/auth')

// uuid — gera identificadores únicos aleatórios
// usado para gerar a api_key de cada sistema
const { v4: uuidv4 } = require('uuid')

// ===================================================
// FUNÇÃO AUXILIAR — GERAR API_KEY
// gera uma chave única e segura para o sistema
// formato: sk_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
// o prefixo sk_ identifica que é uma chave de sistema
// ===================================================

function gerarApiKey() {
  return `sk_${uuidv4()}`
}

//**ROTAS COM PARAMETROS ESTÁTICOS**:

// ===================================================
// GET /sistemas
// lista todos os sistemas cadastrados
// apenas admin acessa
// ===================================================

router.get('/', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const [sistemas] = await db.query(
      'SELECT id, nome, url, ativo, criado_em FROM sistemas ORDER BY criado_em DESC'
    )
    // api_key não é retornada na listagem por segurança
    // ela só é exibida uma vez no momento do cadastro

    res.json({ sistemas })

  } catch (erro) {
    logger.error(`Erro ao listar sistemas: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// POST /sistemas
// cadastra um novo sistema integrado
// gera a api_key automaticamente
// apenas admin acessa
// ===================================================

router.post('/', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { nome, url } = req.body

    if (!nome || !url) {
      return res.status(400).json({
        erro: 'Nome e URL são obrigatórios.'
      })
    }

    // gera a api_key única para esse sistema
    const apiKey = gerarApiKey()

    const [resultado] = await db.query(
      'INSERT INTO sistemas (nome, url, api_key) VALUES (?, ?, ?)',
      [nome, url, apiKey]
    )

    logger.logSistemaCadastrado(nome, url)

    // api_key retornada APENAS neste momento
    // não será possível recuperá-la depois
    // o admin deve copiá-la agora para passar
    // ao administrador do sistema externo
    res.status(201).json({
      mensagem: 'Sistema cadastrado com sucesso.',
      id: resultado.insertId,
      apiKey,
      aviso: 'Guarde a API Key agora. Ela não será exibida novamente.'
    })

  } catch (erro) {
    logger.error(`Erro ao cadastrar sistema: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})


//**ROTAS COM PARAMETROS DINAMICOS**:

// ===================================================
// GET /sistemas/acessos/:email
// consulta em tempo real o nível de acesso
// de um usuário em todos os sistemas ativos
// ===================================================

router.get('/acessos/:email', verificarToken, async (req, res) => {
  try {

    const { email } = req.params

    // busca todos os sistemas ativos
    const [sistemas] = await db.query(
      'SELECT * FROM sistemas WHERE ativo = 1'
    )

    if (sistemas.length === 0) {
      return res.json({ acessos: [] })
    }

    // consulta todos os sistemas em paralelo
    // Promise.all executa todas as requisições ao mesmo tempo
    // muito mais rápido que consultar um por um
    const acessos = await Promise.all(
      sistemas.map(async (sistema) => {
        try {

          // consulta o endpoint do sistema externo
          // envia a api_key no header para autenticação
          const resposta = await fetch(
            `${sistema.url}/acessos?email=${encodeURIComponent(email)}`,
            {
              headers: { 'x-api-key': sistema.api_key },
              // timeout de 5 segundos por sistema
              signal: AbortSignal.timeout(5000)
            }
          )

          const dados = await resposta.json()

          return {
            sistema: sistema.nome,
            sistemaId: sistema.id,
            nivel: dados.nivel || 'desabilitado',
            status: 'online'
          }

        } catch (erroFetch) {
          // sistema não respondeu dentro do timeout
          return {
            sistema: sistema.nome,
            sistemaId: sistema.id,
            nivel: null,
            status: 'offline'
          }
        }
      })
    )

    logger.logConsultaAcessos(email, sistemas.length)

    res.json({ acessos })

  } catch (erro) {
    logger.error(`Erro ao consultar acessos: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// GET /sistemas/:id/status
// verifica se o sistema externo está respondendo
// faz uma requisição real para a URL do sistema
// ===================================================

router.get('/:id/status', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params

    const [rows] = await db.query(
      'SELECT * FROM sistemas WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Sistema não encontrado.' })
    }

    const sistema = rows[0]

    try {

      // tenta consultar o sistema externo com timeout de 5 segundos
      // AbortSignal.timeout cancela a requisição se demorar mais
      const resposta = await fetch(
        `${sistema.url}/acessos?email=ping`,
        {
          headers: { 'x-api-key': sistema.api_key },
          signal: AbortSignal.timeout(5000)
        }
      )

      // qualquer resposta HTTP significa que está online
      // mesmo um 404 ou 401 — o servidor está respondendo
      res.json({
        id: sistema.id,
        nome: sistema.nome,
        status: 'online'
      })

    } catch (erroFetch) {
      // timeout ou conexão recusada — sistema offline
      res.json({
        id: sistema.id,
        nome: sistema.nome,
        status: 'offline'
      })
    }

  } catch (erro) {
    logger.error(`Erro ao verificar status: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})


// ===================================================
// POST /sistemas/:id/regenerar-chave
// gera uma nova api_key para o sistema
// invalida a chave anterior
// apenas admin acessa
// ===================================================

router.post('/:id/regenerar-chave', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params

    const [rows] = await db.query(
      'SELECT nome FROM sistemas WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Sistema não encontrado.' })
    }

    const novaApiKey = gerarApiKey()

    await db.query(
      'UPDATE sistemas SET api_key = ? WHERE id = ?',
      [novaApiKey, id]
    )

    logger.logChaveRegenerada(rows[0].nome)

    res.json({
      mensagem: 'Nova API Key gerada com sucesso.',
      apiKey: novaApiKey,
      aviso: 'Guarde a nova API Key agora. Ela não será exibida novamente.'
    })

  } catch (erro) {
    logger.error(`Erro ao regenerar chave: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})


// ===================================================
// PUT /sistemas/:id
// edita nome e url de um sistema
// não permite alterar a api_key por aqui
// para gerar nova chave use o endpoint de regenerar
// apenas admin acessa
// ===================================================

router.put('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params
    const { nome, url, ativo } = req.body

    // verifica se o sistema existe
    const [rows] = await db.query(
      'SELECT id, nome FROM sistemas WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Sistema não encontrado.' })
    }

    await db.query(
      'UPDATE sistemas SET nome = ?, url = ?, ativo = ? WHERE id = ?',
      [
        nome  || rows[0].nome,
        url   || rows[0].url,
        ativo !== undefined ? ativo : 1,
        id
      ]
    )

    logger.logSistemaAtualizado(nome || rows[0].nome)

    res.json({ mensagem: 'Sistema atualizado com sucesso.' })

  } catch (erro) {
    logger.error(`Erro ao atualizar sistema: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// DELETE /sistemas/:id
// remove um sistema cadastrado
// apenas admin acessa
// ===================================================

router.delete('/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params

    const [rows] = await db.query(
      'SELECT nome FROM sistemas WHERE id = ?',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Sistema não encontrado.' })
    }

    await db.query('DELETE FROM sistemas WHERE id = ?', [id])

    logger.logSistemaRemovido(rows[0].nome)

    res.json({ mensagem: 'Sistema removido com sucesso.' })

  } catch (erro) {
    logger.error(`Erro ao remover sistema: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})


module.exports = router