// ===================================================
// IMPORTAÇÕES
// ===================================================

const router = require('express').Router()
const logger = require('../utils/logger')
const { verificarToken, verificarAdmin } = require('../middleware/auth')

// fs — para ler os arquivos de log
const fs = require('fs')

// path — para montar o caminho da pasta de logs
const path = require('path')

// ===================================================
// CONFIGURAÇÃO DO CAMINHO DOS LOGS
// ===================================================

// caminho absoluto da pasta de logs
// __dirname aqui é backend/routes
// então subimos uma pasta com .. chegando em backend/
// e entramos na pasta logs
const pastaLogs = path.join(__dirname, '..', 'logs')

// ===================================================
// FUNÇÃO AUXILIAR — LER ARQUIVO DE LOG
// ===================================================

// separamos a leitura em uma função auxiliar
// para não repetir a mesma lógica nos dois endpoints
function lerArquivoLog(nomeArquivo) {

  const caminhoArquivo = path.join(pastaLogs, nomeArquivo)

  // verifica se o arquivo existe
  // pode não existir se ainda não houve nenhum erro
  // por exemplo erros.log só é criado quando
  // o winston registra o primeiro erro
  if (!fs.existsSync(caminhoArquivo)) {
    return []
  }

  // lê o conteúdo do arquivo como texto
  // 'utf8' define a codificação — necessário para
  // ler caracteres especiais como acentos
  const conteudo = fs.readFileSync(caminhoArquivo, 'utf8')

  // divide o conteúdo em linhas
  // cada linha é um evento registrado
  // trim() remove espaços e quebras de linha extras
  // filter(Boolean) remove linhas vazias
  const linhas = conteudo
    .trim()
    .split('\n')
    .filter(Boolean)

  // inverte a ordem para mostrar os mais recentes primeiro
  // o arquivo é escrito do mais antigo para o mais novo
  // na tela queremos ver o mais novo primeiro
  return linhas.reverse()
}

// ===================================================
// GET /logs
// retorna os eventos do arquivo app.log
// apenas admin pode acessar os logs
// ===================================================

router.get('/', verificarToken, verificarAdmin, (req, res) => {
  try {

    // query parameter opcional para limitar a quantidade
    // ex: GET /logs?limite=100
    // se não informar, retorna os últimos 500
    // parseInt converte a string da URL para número
    const limite = parseInt(req.query.limite) || 500

    const linhas = lerArquivoLog('app.log')

    // slice(0, limite) pega apenas as primeiras N linhas
    // como já invertemos a ordem, as primeiras são
    // as mais recentes
    const resultado = linhas.slice(0, limite)

    res.json({
      total: resultado.length,
      logs: resultado
    })

  } catch (erro) {
    logger.error(`Erro ao ler logs: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao ler arquivo de log.' })
  }
})

// ===================================================
// GET /logs/erros
// retorna apenas os eventos do arquivo erros.log
// ===================================================

router.get('/erros', verificarToken, verificarAdmin, (req, res) => {
  try {

    const limite = parseInt(req.query.limite) || 500
    const linhas = lerArquivoLog('erros.log')
    const resultado = linhas.slice(0, limite)

    res.json({
      total: resultado.length,
      logs: resultado
    })

  } catch (erro) {
    logger.error(`Erro ao ler logs de erro: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao ler arquivo de log de erros.' })
  }
})

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = router