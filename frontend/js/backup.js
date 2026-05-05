// ===================================================
// CONFIGURAÇÃO
// ===================================================

// DESENVOLVIMENTO LOCAL — sem Docker
//const API_URL = 'http://localhost:3000'

// PRODUÇÃO — com Docker e Nginx
 const API_URL = '/api'

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO E PERMISSÃO
// ===================================================

const token = localStorage.getItem('token')
const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || 'null')

if (!token || !usuarioLogado) {
  window.location.href = 'login.html'
}

// apenas admin acessa a página de backup
if (usuarioLogado.role !== 'admin') {
  window.location.href = 'usuarios.html'
}

// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

const btnBackupAgora = document.getElementById('btnBackupAgora')
const btnAgendar = document.getElementById('btnAgendar')
const btnRestore = document.getElementById('btnRestore')
const btnSair = document.getElementById('btnSair')
const nomeUsuario = document.getElementById('nomeUsuario')
const inputCron = document.getElementById('cronExpressao')
const inputDescricao = document.getElementById('descricao')
const selectBackup = document.getElementById('selectBackup')
const listaBackups = document.getElementById('listaBackups')
const listaAgendamentos = document.getElementById('listaAgendamentos')
const mensagemErro = document.getElementById('mensagemErro')
const mensagemSucesso = document.getElementById('mensagemSucesso')

// ===================================================
// CONFIGURAÇÃO DA NAVBAR
// ===================================================

nomeUsuario.textContent = `👤 ${usuarioLogado.username}`

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
  mensagemSucesso.style.display = 'none'
  window.scrollTo(0, 0)
}

function mostrarSucesso(mensagem) {
  mensagemSucesso.textContent = mensagem
  mensagemSucesso.style.display = 'block'
  mensagemErro.style.display = 'none'
  window.scrollTo(0, 0)
}

// função reutilizada para fazer requisições autenticadas
// evita repetir os headers em todo fetch
async function fetchAutenticado(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      // se vieram headers extras nas opcoes, mantém
      ...opcoes.headers
    }
  })

  // se token expirou, redireciona para login
  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
  }

  return resposta
}

// ===================================================
// FUNÇÃO — BACKUP MANUAL
// ===================================================

async function fazerBackupAgora() {
  try {

    btnBackupAgora.disabled = true
    btnBackupAgora.textContent = '⏳ Gerando backup...'

    const resposta = await fetchAutenticado(`${API_URL}/backup/agora`, {
      method: 'POST'
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao gerar backup.')
      return
    }

    mostrarSucesso(`Backup gerado com sucesso: ${dados.arquivo}`)

    // recarrega a lista de backups para mostrar o novo
    carregarBackups()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    btnBackupAgora.disabled = false
    btnBackupAgora.textContent = '💾 Fazer Backup Agora'
  }
}

// ===================================================
// FUNÇÃO — CARREGAR LISTA DE BACKUPS
// ===================================================

async function carregarBackups() {
  try {

    const resposta = await fetchAutenticado(`${API_URL}/backup/listar`)
    const dados = await resposta.json()

    if (!resposta.ok) {
      listaBackups.innerHTML = '<p style="color:#e74c3c">Erro ao carregar backups.</p>'
      return
    }

    // atualiza o select do restore
    if (dados.backups.length === 0) {
      selectBackup.innerHTML = '<option value="">-- Nenhum backup disponível --</option>'
      listaBackups.innerHTML = '<p style="color:#999;font-size:14px">Nenhum backup encontrado.</p>'
      return
    }

    // preenche o select com os backups disponíveis
    selectBackup.innerHTML = '<option value="">-- Selecione um backup --</option>' +
      dados.backups.map(b => `
        <option value="${b.nome}">${b.nome} (${b.tamanho})</option>
      `).join('')

    // renderiza a tabela de backups
    listaBackups.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Tamanho</th>
            <th>Gerado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${dados.backups.map(b => `
            <tr>
              <td style="font-size:13px">${b.nome}</td>
              <td>${b.tamanho}</td>
              <td style="font-size:13px">${b.criadoEm}</td>
              <td class="acoes">
                  <button
                    class="btn btn-perigo btn-pequeno"
                    onclick="deletarBackup('${b.nome}')"
                    >
                    🗑 Excluir
                  </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

  } catch (erro) {
    listaBackups.innerHTML = '<p style="color:#e74c3c">Erro ao conectar ao servidor.</p>'
  }
}

// ===================================================
// FUNÇÃO — RESTAURAR BACKUP
// ===================================================

async function restaurarBackup() {

  const nomeArquivo = selectBackup.value

  if (!nomeArquivo) {
    mostrarErro('Selecione um backup para restaurar.')
    return
  }

  // confirmação dupla por ser uma operação destrutiva
  // substituirá TODOS os dados atuais do banco
  const confirmado = confirm(
    `⚠️ ATENÇÃO!\n\n` +
    `Restaurar o backup "${nomeArquivo}" irá substituir TODOS os dados atuais do banco.\n\n` +
    `Essa ação não pode ser desfeita.\n\n` +
    `Deseja continuar?`
  )

  if (!confirmado) return

  try {

    btnRestore.disabled = true
    btnRestore.textContent = '⏳ Restaurando...'

    const resposta = await fetchAutenticado(`${API_URL}/backup/restaurar`, {
      method: 'POST',
      body: JSON.stringify({ nomeArquivo })
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao restaurar backup.')
      return
    }

    mostrarSucesso('Banco restaurado com sucesso!')

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    btnRestore.disabled = false
    btnRestore.textContent = '↩ Restaurar Banco'
  }
}

// ===================================================
// FUNÇÃO — DELETAR BACKUP
// ===================================================

async function deletarBackup(nomeArquivo) {

  // pede confirmação antes de deletar
  // operação irreversível
  const confirmado = confirm(
    `Deseja excluir o backup "${nomeArquivo}"?\n\nEssa ação não pode ser desfeita.`
  )
  if (!confirmado) return

  try {

    const resposta = await fetchAutenticado(
      `${API_URL}/backup/deletar/${nomeArquivo}`,
      { method: 'DELETE' }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao deletar backup.')
      return
    }

    mostrarSucesso(`Backup "${nomeArquivo}" excluído com sucesso.`)

    // recarrega a lista após deletar
    carregarBackups()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// FUNÇÃO — SALVAR AGENDAMENTO
// ===================================================

async function salvarAgendamento() {

  const cronExpressao = inputCron.value.trim()
  const descricao = inputDescricao.value.trim()

  if (!cronExpressao) {
    mostrarErro('A expressão cron é obrigatória.')
    inputCron.focus()
    return
  }

  try {

    btnAgendar.disabled = true
    btnAgendar.textContent = '⏳ Salvando...'

    const resposta = await fetchAutenticado(`${API_URL}/backup/agendar`, {
      method: 'POST',
      body: JSON.stringify({ cronExpressao, descricao })
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao salvar agendamento.')
      return
    }

    mostrarSucesso('Agendamento salvo com sucesso!')

    // limpa os campos após salvar
    inputCron.value = ''
    inputDescricao.value = ''

    // recarrega a lista de agendamentos
    carregarAgendamentos()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    btnAgendar.disabled = false
    btnAgendar.textContent = '📅 Salvar Agendamento'
  }
}

// ===================================================
// FUNÇÃO — CARREGAR AGENDAMENTOS
// ===================================================

async function carregarAgendamentos() {
  try {

    const resposta = await fetchAutenticado(`${API_URL}/backup/agendamentos`)
    const dados = await resposta.json()

    if (!resposta.ok || dados.agendamentos.length === 0) {
      listaAgendamentos.innerHTML = '<p style="color:#999;font-size:13px;margin-top:8px">Nenhum agendamento configurado.</p>'
      return
    }

    listaAgendamentos.innerHTML = `
      <table style="margin-top:8px">
        <thead>
          <tr>
            <th>Expressão</th>
            <th>Descrição</th>
            <th>Último backup</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${dados.agendamentos.map(a => `
            <tr>
              <td><code>${a.cron_expressao}</code></td>
              <td>${a.descricao}</td>
              <td style="font-size:13px">
                ${a.ultimo_backup
                  ? new Date(a.ultimo_backup).toLocaleString('pt-BR')
                  : 'Nunca executado'
                }
              </td>
              <td>
                <button
                  class="btn btn-perigo btn-pequeno"
                  onclick="removerAgendamento(${a.id})"
                >
                  Remover
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

  } catch (erro) {
    listaAgendamentos.innerHTML = '<p style="color:#e74c3c;font-size:13px">Erro ao carregar agendamentos.</p>'
  }
}

// ===================================================
// FUNÇÃO — REMOVER AGENDAMENTO
// ===================================================

async function removerAgendamento(id) {

  const confirmado = confirm('Deseja remover este agendamento?')
  if (!confirmado) return

  try {

    const resposta = await fetchAutenticado(
      `${API_URL}/backup/agendamentos/${id}`,
      { method: 'DELETE' }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao remover agendamento.')
      return
    }

    mostrarSucesso('Agendamento removido com sucesso.')
    carregarAgendamentos()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// LOGOUT
// ===================================================

btnSair.addEventListener('click', async (e) => {
  e.preventDefault()
  try {
    await fetchAutenticado(`${API_URL}/auth/logout`, { method: 'POST' })
  } catch (erro) {
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
  }
})

// ===================================================
// EVENTOS
// ===================================================

btnBackupAgora.addEventListener('click', fazerBackupAgora)
btnAgendar.addEventListener('click', salvarAgendamento)
btnRestore.addEventListener('click', restaurarBackup)

// ===================================================
// INICIALIZAÇÃO
// ===================================================

carregarBackups()
carregarAgendamentos()

// ===================================================
// AJUDA DO CRON — ABRE E FECHA
// ===================================================

const btnAjudaCron = document.getElementById('btnAjudaCron')
const ajudaCron = document.getElementById('ajudaCron')

btnAjudaCron.addEventListener('click', () => {

  const estaAberto = ajudaCron.style.display === 'block'

  if (estaAberto) {
    ajudaCron.style.display = 'none'
    btnAjudaCron.textContent = 'ℹ️ Como configurar o agendamento automático (Cron) ▼'
  } else {
    ajudaCron.style.display = 'block'
    btnAjudaCron.textContent = 'ℹ️ Como configurar o agendamento automático (Cron) ▲'
  }
})

// preenche o campo de expressão cron com o exemplo clicado
function usarExpressao(expressao) {
  inputCron.value = expressao
  // fecha a ajuda após escolher
  ajudaCron.style.display = 'none'
  btnAjudaCron.textContent = 'ℹ️ Como configurar o agendamento automático (Cron) ▼'
  // coloca o foco no campo de descrição
  inputDescricao.focus()
}