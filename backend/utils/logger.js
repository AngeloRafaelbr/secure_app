// ===================================================
// IMPORTAÇÕES
// ===================================================

// winston — biblioteca de logs profissional
// permite salvar logs em arquivo, console, ou ambos
// com níveis diferentes (info, warn, error)
const winston = require('winston')

// path e fs — para criar a pasta de logs
// caso ela não exista ainda
const path = require('path')
const fs = require('fs')

// ===================================================
// CRIAÇÃO DA PASTA DE LOGS
// ===================================================

// define onde ficará a pasta de logs
// __dirname é uma variável do Node que contém
// o caminho absoluto da pasta do arquivo atual
// ex: C:\meu-app\backend\utils
// path.join sobe uma pasta com '..' chegando em:
// ex: C:\meu-app\backend\logs
const pastaLogs = path.join(__dirname, '..', 'logs')

// cria a pasta se ela não existir
// { recursive: true } não dá erro se já existir
if (!fs.existsSync(pastaLogs)) {
  fs.mkdirSync(pastaLogs, { recursive: true })
}

// ===================================================
// FORMATO DO LOG
// ===================================================

// define como cada linha do log vai aparecer no arquivo
// exemplo de saída:
// [15/01/2024 02:13:45] [INFO] CADASTRO_USUARIO | usuário: "joao" | Novo usuário cadastrado.
const formato = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`
})

// ===================================================
// CRIAÇÃO DO LOGGER
// ===================================================

const logger = winston.createLogger({

  // formato aplicado a todos os transportes
  format: winston.format.combine(

    // adiciona o campo timestamp com a data formatada
    winston.format.timestamp({
      format: 'DD/MM/YYYY HH:mm:ss'
    }),

    // aplica o formato personalizado definido acima
    formato
  ),

  // transportes — onde os logs serão gravados
  // você pode ter vários ao mesmo tempo
  transports: [

    // salva TODOS os logs no arquivo app.log
    new winston.transports.File({
      filename: path.join(pastaLogs, 'app.log')
    }),

    // salva apenas erros em um arquivo separado
    // útil para encontrar problemas rapidamente
    new winston.transports.File({
      filename: path.join(pastaLogs, 'erros.log'),
      level: 'error'
    }),

    // também exibe no terminal durante desenvolvimento
    new winston.transports.Console()
  ]
})

// ===================================================
// FUNÇÕES DE LOG POR EVENTO
// ===================================================
// cada função representa um evento específico
// do requisito 3 do projeto
// isso padroniza as mensagens — todo lugar que
// registrar um cadastro usará exatamente o mesmo formato

// requisito 3.1 — cadastro de novo usuário
logger.logCadastroUsuario = (username) => {
  logger.info(
    `CADASTRO_USUARIO | usuário: "${username}" | Novo usuário cadastrado no sistema.`
  )
}

// requisito 3.2 — alteração de dados ou senha
logger.logAlteracaoUsuario = (username, campo) => {
  logger.info(
    `ALTERACAO_USUARIO | usuário: "${username}" | Dado alterado: ${campo}.`
  )
}

// requisito 3.3 — exclusão de usuário
logger.logExclusaoUsuario = (username) => {
  logger.info(
    `EXCLUSAO_USUARIO | usuário: "${username}" | Usuário excluído do sistema.`
  )
}

// requisito 3.4 — falha de autenticação
logger.logFalhaLogin = (username) => {
  logger.warn(
    `FALHA_LOGIN | usuário: "${username}" | Tentativa de login com credenciais inválidas.`
  )
}

// requisito 3.5 — 5 falhas consecutivas
logger.logUsuarioBloqueado = (username) => {
  logger.warn(
    `USUARIO_BLOQUEADO | usuário: "${username}" | Bloqueado por 10 minutos após 5 falhas consecutivas.`
  )
}

// requisito 3.6 — eventos da aplicação

logger.logLoginSucesso = (username) => {
  logger.info(
    `LOGIN_SUCESSO | usuário: "${username}" | Login realizado com sucesso.`
  )
}

logger.logLogout = (username) => {
  logger.info(
    `LOGOUT | usuário: "${username}" | Usuário encerrou a sessão.`
  )
}

logger.logBackupRealizado = (arquivo) => {
  logger.info(
    `BACKUP_REALIZADO | arquivo: "${arquivo}" | Backup do banco gerado com sucesso.`
  )
}

logger.logRestoreRealizado = (arquivo) => {
  logger.info(
    `RESTORE_REALIZADO | arquivo: "${arquivo}" | Banco restaurado a partir do backup.`
  )
}

logger.logBackupAgendado = (expressao) => {
  logger.info(
    `BACKUP_AGENDADO | expressão: "${expressao}" | Novo agendamento de backup configurado.`
  )
}

logger.logTrocaSenha = (username) => {
  logger.info(
    `TROCA_SENHA | usuário: "${username}" | Senha alterada com sucesso.`
  )
}

// ===================================================
// EVENTOS DE SISTEMAS INTEGRADOS
// ===================================================

logger.logSistemaCadastrado = (nome, url) => {
  logger.info(
    `SISTEMA_CADASTRADO | sistema: "${nome}" | ` +
    `Novo sistema integrado cadastrado. URL: ${url}`
  )
}

logger.logSistemaAtualizado = (nome) => {
  logger.info(
    `SISTEMA_ATUALIZADO | sistema: "${nome}" | ` +
    `Dados do sistema atualizados.`
  )
}

logger.logSistemaRemovido = (nome) => {
  logger.info(
    `SISTEMA_REMOVIDO | sistema: "${nome}" | ` +
    `Sistema integrado removido.`
  )
}

logger.logChaveRegenerada = (nome) => {
  logger.info(
    `SISTEMA_CHAVE_REGENERADA | sistema: "${nome}" | ` +
    `API Key regenerada. Chave anterior invalidada.`
  )
}

logger.logConsultaAcessos = (email, totalSistemas) => {
  logger.info(
    `CONSULTA_ACESSOS | email: "${email}" | ` +
    `Acessos consultados em ${totalSistemas} sistema(s).`
  )
}

logger.logTokenVerificado = (username, sistema) => {
  logger.info(
    `TOKEN_VERIFICADO | usuário: "${username}" | ` +
    `Token verificado pelo sistema: "${sistema}".`
  )
}

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = logger