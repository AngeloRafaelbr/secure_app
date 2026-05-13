// ===================================================
// IMPORTAÇÕES
// ===================================================

const router = require('express').Router()
const db = require('../database')
const logger = require('../utils/logger')
const { verificarToken, verificarAdmin } = require('../middleware/auth')

// path — para montar caminhos de pasta
const path = require('path')

// fs — módulo nativo do Node para ler e escrever
// arquivos e pastas no sistema de arquivos
const fs = require('fs')

// child_process — módulo nativo do Node que permite
// executar comandos do sistema operacional a partir
// do código JavaScript
// exec — executa um comando e retorna o resultado
const { exec } = require('child_process')

// node-cron — biblioteca para agendar tarefas
// usa a sintaxe cron para definir horários
// ex: '0 2 * * *' = todo dia às 02:00
const cron = require('node-cron')

// ===================================================
// CONFIGURAÇÃO DA PASTA DE BACKUPS
// ===================================================

// define o caminho absoluto da pasta de backups
const pastaBackups = path.join(__dirname, '..', 'backups')

// cria a pasta se não existir
if (!fs.existsSync(pastaBackups)) {
  fs.mkdirSync(pastaBackups, { recursive: true })
}

// ===================================================
// OBJETO QUE GUARDA OS JOBS DE AGENDAMENTO ATIVOS
// ===================================================

// quando o servidor inicia ou um novo agendamento
// é criado, guardamos o job aqui usando o id como chave
// ex: { 1: job, 2: job }
// isso permite cancelar um agendamento pelo id
const jobsAtivos = {}

// ===================================================
// FUNÇÃO AUXILIAR — EXECUTAR BACKUP
// ===================================================

// lógica do backup em uma função
// para reutilizar tanto no backup manual
// quanto no backup agendado
function executarBackup() {
  return new Promise((resolve, reject) => {

    const agora = new Date()
    const timestamp = agora
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19)

    const nomeArquivo = `backup_${timestamp}.sql`
    const caminhoArquivo = path.join(pastaBackups, nomeArquivo)

    const host     = process.env.DB_HOST
    const user     = process.env.DB_USER
    const password = process.env.DB_PASSWORD
    const database = process.env.DB_NAME

    let comando

    if (host === 'localhost') {
      // ambiente local — Windows sem mysqldump instalado
      // roda o mysqldump dentro do container Docker via docker exec
      // o arquivo é gerado dentro do container e depois
      // copiado para a pasta local com docker cp
      comando =
        `docker exec mysql_app mysqldump` +
        ` -u ${user}` +
        ` -p${password}` +
        ` ${database}` +
        ` > "${caminhoArquivo}"`

    } else {
      // ambiente Docker — mysqldump disponível no container backend
      // conecta ao MySQL pelo hostname interno da rede Docker
      comando =
        `mysqldump` +
        ` -h ${host}` +
        ` -u ${user}` +
        ` -p${password}` +
        ` ${database}` +
        ` > "${caminhoArquivo}"`
    }
    exec(comando, (erro, stdout, stderr) => {
      if (erro) {
        return reject(new Error(stderr || erro.message))
      }
      resolve(nomeArquivo)
    })
  })
}

// ===================================================
// POST /backup/agora
// backup manual — requisito 2.1.1
// ===================================================

router.post('/agora', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const nomeArquivo = await executarBackup()

    //  log de backup realizado
    logger.logBackupRealizado(nomeArquivo)

    res.json({
      mensagem: 'Backup realizado com sucesso.',
      arquivo: nomeArquivo
    })

  } catch (erro) {
    logger.error(`Erro ao realizar backup: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao realizar backup.' })
  }
})

// ===================================================
// GET /backup/listar
// lista os arquivos de backup existentes
// ===================================================

router.get('/listar', verificarToken, verificarAdmin, (req, res) => {
  try {

    // lê todos os arquivos da pasta de backups
    const arquivos = fs.readdirSync(pastaBackups)

      // filtra apenas arquivos .sql
      .filter(arquivo => arquivo.endsWith('.sql'))

      // para cada arquivo, retorna nome, tamanho e data
      .map(arquivo => {
        const caminho = path.join(pastaBackups, arquivo)

        // statSync retorna informações do arquivo
        // como tamanho em bytes e data de modificação
        const info = fs.statSync(caminho)

        return {
          nome: arquivo,
          // converte bytes para KB com 2 casas decimais
          tamanho: (info.size / 1024).toFixed(2) + ' KB',
          criadoEm: info.mtime.toLocaleString('pt-BR')
        }
      })

      // ordena do mais recente para o mais antigo
      .sort((a, b) => b.nome.localeCompare(a.nome))

    res.json({ backups: arquivos })

  } catch (erro) {
    logger.error(`Erro ao listar backups: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao listar backups.' })
  }
})

// ===================================================
// DELETE /backup/deletar/:nomeArquivo
// deleta um arquivo de backup específico
// ===================================================

router.delete('/deletar/:nomeArquivo', verificarToken, verificarAdmin, (req, res) => {
  try {

    const { nomeArquivo } = req.params

    // segurança — garante que o nome do arquivo
    // não contém caracteres que permitiriam
    // navegar para outras pastas
    // ex: ../../etc/passwd
    if (nomeArquivo.includes('/') || nomeArquivo.includes('..')) {
      return res.status(400).json({ erro: 'Nome de arquivo inválido.' })
    }

    // garante que só arquivos .sql podem ser deletados
    if (!nomeArquivo.endsWith('.sql')) {
      return res.status(400).json({ erro: 'Apenas arquivos .sql podem ser deletados.' })
    }

    const caminhoArquivo = path.join(pastaBackups, nomeArquivo)

    // verifica se o arquivo existe
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ erro: 'Arquivo não encontrado.' })
    }

    // deleta o arquivo
    fs.unlinkSync(caminhoArquivo)

    logger.info(`BACKUP_DELETADO | arquivo: "${nomeArquivo}" | Arquivo de backup removido.`)

    res.json({ mensagem: `Backup "${nomeArquivo}" deletado com sucesso.` })

  } catch (erro) {
    logger.error(`Erro ao deletar backup: ${erro.message}`)
    res.status(500).json({ erro: 'Erro ao deletar backup.' })
  }
})

// ===================================================
// POST /backup/restaurar
// restaura o banco a partir de um arquivo — requisito 2.1.2
// ===================================================

router.post('/restaurar', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { nomeArquivo } = req.body

    if (!nomeArquivo) {
      return res.status(400).json({ erro: 'Nome do arquivo é obrigatório.' })
    }

    const caminhoArquivo = path.join(pastaBackups, nomeArquivo)

    // verifica se o arquivo existe antes de tentar restaurar
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ erro: 'Arquivo de backup não encontrado.' })
    }

   const host     = process.env.DB_HOST
const user     = process.env.DB_USER
const password = process.env.DB_PASSWORD
const database = process.env.DB_NAME

let comando

if (host === 'localhost') {
  // ambiente local — usa docker exec para rodar
  // o cliente mysql dentro do container
  comando =
    `docker exec -i mysql_app mysql` +
    ` -u ${user}` +
    ` -p${password}` +
    ` ${database}` +
    ` < "${caminhoArquivo}"`
} else {
  // ambiente Docker — cliente mysql disponível no container
  comando =
    `mysql` +
    ` -h ${host}` +
    ` -u ${user}` +
    ` -p${password}` +
    ` ${database}` +
    ` < "${caminhoArquivo}"`
}

    exec(comando, (erro, stdout, stderr) => {

      if (erro) {
        logger.error(`Erro ao restaurar backup: ${stderr || erro.message}`)
        return res.status(500).json({ erro: 'Erro ao restaurar backup.' })
      }

      // requisito 3.6 — log de restore realizado
      logger.logRestoreRealizado(nomeArquivo)

      res.json({ mensagem: 'Banco restaurado com sucesso.' })
    })

  } catch (erro) {
    logger.error(`Erro ao restaurar backup: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// POST /backup/agendar
// cria um novo agendamento — requisito 2.1.1
// ===================================================

router.post('/agendar', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { cronExpressao, descricao, tipo } = req.body

    if (!cronExpressao) {
      return res.status(400).json({ erro: 'Expressão cron é obrigatória.' })
    }

    // valida se a expressão cron é válida
    // ex: '0 2 * * *' é válida
    //     'abc' não é válida
    if (!cron.validate(cronExpressao)) {
      return res.status(400).json({
        erro: 'Expressão cron inválida.',
        exemplos: {
          'todo dia às 2h': '0 2 * * *',
          'a cada 6 horas': '0 */6 * * *',
          'toda segunda às 3h': '0 3 * * 1'
        }
      })
    }

    // salva o agendamento no banco
    const [resultado] = await db.query(
      'INSERT INTO backup_agendamentos (cron_expressao, descricao, tipo) VALUES (?, ?, ?)',
      [cronExpressao, descricao || 'Backup agendado', tipo || 'recorrente']
    )

    const novoId = resultado.insertId

    const tipoDefinido = tipo || 'recorrente'


    // cria o job do cron na memória do servidor
    const job = cron.schedule(cronExpressao, async () => {
      try {

        const nomeArquivo = await executarBackup()
        logger.logBackupRealizado(nomeArquivo)

        // atualiza o campo ultimo_backup no banco
        await db.query(
          'UPDATE backup_agendamentos SET ultimo_backup = NOW() WHERE id = ?',
          [novoId]
        )

 if (tipoDefinido === 'eventual') {

      // para o job do cron
      job.stop()

      // remove da memória
      delete jobsAtivos[novoId]

      // remove do banco — não precisa mais persistir
      await db.query(
        'DELETE FROM backup_agendamentos WHERE id = ?',
        [novoId]
      )

      logger.info(
        `AGENDAMENTO_EVENTUAL_CONCLUIDO | id=${novoId} | ` +
        `Backup eventual executado e agendamento removido automaticamente.`
      )
    }

      } catch (erro) {
        logger.error(`Erro no backup agendado id=${novoId}: ${erro.message}`)
      }
    })

    // guarda o job no objeto de jobs ativos
    jobsAtivos[novoId] = job

    // requisito 3.6 — log de agendamento criado
    logger.logBackupAgendado(cronExpressao)

    res.status(201).json({
      mensagem: 'Agendamento criado com sucesso.',
      id: novoId
    })

  } catch (erro) {
    logger.error(`Erro ao agendar backup: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// GET /backup/agendamentos
// lista os agendamentos salvos no banco
// ===================================================

router.get('/agendamentos', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const [agendamentos] = await db.query(
      'SELECT * FROM backup_agendamentos ORDER BY criado_em DESC'
    )

    res.json({ agendamentos })

  } catch (erro) {
    logger.error(`Erro ao listar agendamentos: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// DELETE /backup/agendamentos/:id
// remove um agendamento
// ===================================================

router.delete('/agendamentos/:id', verificarToken, verificarAdmin, async (req, res) => {
  try {

    const { id } = req.params

    // cancela o job ativo se existir, para evitar que continue rodando depois de deletar do banco
    if (jobsAtivos[id]) {
      jobsAtivos[id].stop()
      delete jobsAtivos[id]
    }

    await db.query(
      'DELETE FROM backup_agendamentos WHERE id = ?',
      [id]
    )

    res.json({ mensagem: 'Agendamento removido com sucesso.' })

  } catch (erro) {
    logger.error(`Erro ao remover agendamento: ${erro.message}`)
    res.status(500).json({ erro: 'Erro interno do servidor.' })
  }
})

// ===================================================
// FUNÇÃO PARA RECARREGAR AGENDAMENTOS
// ===================================================

// quando o servidor reinicia os jobs somem da memória
// essa função lê os agendamentos salvos no banco
// e recria os jobs automaticamente
// será chamada no server.js na inicialização
async function recarregarAgendamentos() {
  try {

    const [agendamentos] = await db.query(
      'SELECT * FROM backup_agendamentos WHERE ativo = 1'
    )

    for (const agendamento of agendamentos) {

      if (cron.validate(agendamento.cron_expressao)) {

        const tipoDefinido = agendamento.tipo || 'recorrente'

        const job = cron.schedule(agendamento.cron_expressao, async () => {
          try {

            const nomeArquivo = await executarBackup()
            logger.logBackupRealizado(nomeArquivo)

            await db.query(
              'UPDATE backup_agendamentos SET ultimo_backup = NOW() WHERE id = ?',
              [agendamento.id]
            )

            // eventual sem repetição — remove após executar
            if (tipoDefinido === 'eventual') {

              job.stop()
              delete jobsAtivos[agendamento.id]

              await db.query(
                'DELETE FROM backup_agendamentos WHERE id = ?',
                [agendamento.id]
              )

              logger.info(
                `AGENDAMENTO_EVENTUAL_CONCLUIDO | id=${agendamento.id} | ` +
                `Backup eventual executado e agendamento removido automaticamente.`
              )
            }

          } catch (erro) {
            logger.error(`Erro no backup agendado id=${agendamento.id}: ${erro.message}`)
          }
        })

        jobsAtivos[agendamento.id] = job
        logger.info(`Agendamento id=${agendamento.id} recarregado: ${agendamento.cron_expressao}`)
      }
    }

  } catch (erro) {
    logger.error(`Erro ao recarregar agendamentos: ${erro.message}`)
  }
}

// ===================================================
// EXPORTAÇÃO
// ===================================================

// exporta o router e a função de recarregar
// a função será chamada no server.js
module.exports = { router, recarregarAgendamentos }