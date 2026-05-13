// ===================================================
// BACKUP.JS
// Lógica da página de Backup & Restore
// Responsabilidades:
//   - Backup manual
//   - Agendamento visual (recorrente e eventual)
//   - Restore do banco
//   - Listagem e exclusão de backups
//   - Listagem e remoção de agendamentos
// ===================================================


// ===================================================
// CONFIGURAÇÃO
// ===================================================

// DESENVOLVIMENTO LOCAL — sem Docker
const API_URL = 'http://localhost:3000'

// PRODUÇÃO — com Docker e Nginx
// const API_URL = '/api'




// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO E PERMISSÃO
// ===================================================

const token = localStorage.getItem('token')
const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || 'null')

// redireciona para login se não estiver autenticado
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

// navbar
const nomeUsuario      = document.getElementById('nomeUsuario')
const btnSair          = document.getElementById('btnSair')

// alertas
const mensagemErro     = document.getElementById('mensagemErro')
const mensagemSucesso  = document.getElementById('mensagemSucesso')

// backup manual
const btnBackupAgora   = document.getElementById('btnBackupAgora')

// abas
const abaRecorrente    = document.getElementById('abaRecorrente')
const abaEventual      = document.getElementById('abaEventual')
const painelRecorrente = document.getElementById('painelRecorrente')
const painelEventual   = document.getElementById('painelEventual')

// agendamento recorrente
const horaRecorrente        = document.getElementById('horaRecorrente')
const minutoRecorrente      = document.getElementById('minutoRecorrente')
const descricaoRecorrente   = document.getElementById('descricaoRecorrente')
const btnAgendarRecorrente  = document.getElementById('btnAgendarRecorrente')

// agendamento eventual
const dataEventual          = document.getElementById('dataEventual')
const horaEventual          = document.getElementById('horaEventual')
const minutoEventual        = document.getElementById('minutoEventual')
const repetirMensalmente    = document.getElementById('repetirMensalmente')
const descricaoEventual     = document.getElementById('descricaoEventual')
const btnAgendarEventual    = document.getElementById('btnAgendarEventual')

// listas
const listaAgendamentos = document.getElementById('listaAgendamentos')
const listaBackups      = document.getElementById('listaBackups')
const selectBackup      = document.getElementById('selectBackup')

// restore
const btnRestore        = document.getElementById('btnRestore')

// ===================================================
// CONFIGURAÇÃO DA NAVBAR
// ===================================================

nomeUsuario.textContent = `👤 ${usuarioLogado.username}`

// ===================================================
// INICIALIZAÇÃO DOS SELECTS DE HORA
// ===================================================

// gera as opções de 00 a 23 nos selects de hora
// feito via JS para não escrever 24 <option> no HTML
function preencherSelectHoras(selectId) {
  const select = document.getElementById(selectId)
  for (let i = 0; i < 24; i++) {
    const option = document.createElement('option')
    // formata com zero à esquerda: 0 → "00", 9 → "09"
    option.value = String(i).padStart(2, '0')
    option.textContent = String(i).padStart(2, '0')
    select.appendChild(option)
  }
}

preencherSelectHoras('horaRecorrente')
preencherSelectHoras('horaEventual')

// ===================================================
// INICIALIZAÇÃO DOS SELECTS DE MINUTO
// ===================================================

// gera as opções de 00 a 59 nos selects de minuto
// feito via JS para não escrever 60 <option> no HTML
function preencherSelectMinutos(selectId) {
  const select = document.getElementById(selectId)
  for (let i = 0; i < 60; i++) {
    const option = document.createElement('option')
    // formata com zero à esquerda: 0 → "00", 9 → "09"
    option.value = String(i).padStart(2, '0')
    option.textContent = String(i).padStart(2, '0')
    select.appendChild(option)
  }
}

preencherSelectMinutos('minutoRecorrente')
preencherSelectMinutos('minutoEventual')

// ===================================================
// INICIALIZAÇÃO DO INPUT DE DATA
// ===================================================

// define a data mínima como hoje
// impede o usuário de selecionar datas passadas
function definirDataMinima() {
  const hoje = new Date()
  // toISOString retorna "2026-04-07T..." — pegamos só os 10 primeiros chars
  const hojeFormatado = hoje.toISOString().split('T')[0]
  dataEventual.min = hojeFormatado
  dataEventual.value = hojeFormatado
}

definirDataMinima()

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

// exibe mensagem de erro no topo da página
function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
  mensagemSucesso.style.display = 'none'
  window.scrollTo(0, 0)
}

// exibe mensagem de sucesso no topo da página
function mostrarSucesso(mensagem) {
  mensagemSucesso.textContent = mensagem
  mensagemSucesso.style.display = 'block'
  mensagemErro.style.display = 'none'
  window.scrollTo(0, 0)
}

// função reutilizável para fetch autenticado
// adiciona o token JWT em todas as requisições
// redireciona para login se token expirar (401)
async function fetchAutenticado(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...opcoes.headers
    }
  })

  if (resposta.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
  }

  return resposta
}

// ===================================================
// FUNÇÕES DE GERAÇÃO DE EXPRESSÃO CRON
// ===================================================

// gera expressão cron para backup recorrente
// a partir dos dias da semana selecionados e horário
// ex: dias=[1,5], hora='03', minuto='00' → "0 3 * * 1,5"
function gerarCronRecorrente(diasSelecionados, hora, minuto) {

  // remove zero à esquerda do minuto para o cron
  // "00" → 0, "15" → 15
  const min = parseInt(minuto)
  const h   = parseInt(hora)

  // se todos os 7 dias foram selecionados
  // usa * ao invés de listar todos: "0 3 * * *"
  if (diasSelecionados.length === 7) {
    return `${min} ${h} * * *`
  }

  // ordena os dias para ficar mais legível
  // e junta com vírgula: [1,3,5] → "1,3,5"
  const dias = [...diasSelecionados].sort().join(',')

  return `${min} ${h} * * ${dias}`
}

// gera expressão cron para backup eventual
// a partir de uma data específica e horário
// ex: data='2026-04-15', hora='14', minuto='00'
//     sem repetição  → "0 14 15 4 *"
//     com repetição  → "0 14 15 * *"
function gerarCronEventual(data, hora, minuto, repetir) {

  const min = parseInt(minuto)
  const h   = parseInt(hora)

  // divide a data "2026-04-15" em partes
  const [ano, mes, dia] = data.split('-')

  if (repetir) {
    // ignora o mês — repete todo mês naquele dia
    return `${min} ${h} ${parseInt(dia)} * *`
  }

  // inclui o mês — executa só naquela data específica
  // parseInt remove o zero à esquerda: "04" → 4
  return `${min} ${h} ${parseInt(dia)} ${parseInt(mes)} *`
}

// ===================================================
// CONTROLE DAS ABAS
// ===================================================

// alterna entre os painéis Recorrente e Eventual
// atualiza as classes visuais das abas e painéis
function trocarAba(tipo) {

  if (tipo === 'recorrente') {
    // ativa aba recorrente
    abaRecorrente.classList.add('ativa')
    abaEventual.classList.remove('ativa')
    // exibe painel recorrente
    painelRecorrente.classList.add('ativo')
    painelEventual.classList.remove('ativo')

  } else {
    // ativa aba eventual
    abaEventual.classList.add('ativa')
    abaRecorrente.classList.remove('ativa')
    // exibe painel eventual
    painelEventual.classList.add('ativo')
    painelRecorrente.classList.remove('ativo')
  }
}

// expõe a função globalmente para o onclick do HTML
window.trocarAba = trocarAba

// ===================================================
// BACKUP MANUAL
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

    // recarrega a lista para exibir o novo arquivo
    carregarBackups()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  } finally {
    btnBackupAgora.disabled = false
    btnBackupAgora.textContent = '💾 Fazer Backup Agora'
  }
}

// ===================================================
// AGENDAMENTO — BACKUP RECORRENTE
// ===================================================

async function agendarRecorrente() {

  // lê quais checkboxes de dia estão marcados
  // querySelectorAll retorna todos os .dia-check marcados
  const checkboxesMarcados = document.querySelectorAll('.dia-check:checked')

  // extrai os values (números dos dias) para um array
  // Array.from converte NodeList para Array
  // map pega o .value de cada checkbox
  const diasSelecionados = Array.from(checkboxesMarcados)
    .map(cb => parseInt(cb.value))

  // valida se pelo menos um dia foi selecionado
  if (diasSelecionados.length === 0) {
    mostrarErro('Selecione pelo menos um dia da semana.')
    return
  }

  const hora        = horaRecorrente.value
  const minuto      = minutoRecorrente.value
  const descricao   = descricaoRecorrente.value.trim()

  // gera a expressão cron a partir das seleções
  const cronExpressao = gerarCronRecorrente(diasSelecionados, hora, minuto)

  await enviarAgendamento(cronExpressao, descricao || 'Backup recorrente', 'recorrente')

  // limpa os campos após agendar
  document.querySelectorAll('.dia-check').forEach(cb => cb.checked = false)
  descricaoRecorrente.value = ''
}

// ===================================================
// AGENDAMENTO — BACKUP EVENTUAL
// ===================================================

async function agendarEventual() {

  const data    = dataEventual.value
  const hora    = horaEventual.value
  const minuto  = minutoEventual.value
  const repetir = repetirMensalmente.checked
  const descricao = descricaoEventual.value.trim()

  // valida se uma data foi selecionada
  if (!data) {
    mostrarErro('Selecione uma data para o backup.')
    return
  }

  // gera a expressão cron a partir das seleções
  const cronExpressao = gerarCronEventual(data, hora, minuto, repetir)

  // monta descrição automática se não foi informada
  const [ano, mes, dia] = data.split('-')
  const dataFormatada = `${dia}/${mes}/${ano}`
  const descricaoFinal = descricao ||
    (repetir
      ? `Backup mensal todo dia ${dia}`
      : `Backup eventual em ${dataFormatada}`)

  await enviarAgendamento(cronExpressao, descricaoFinal, 'eventual')

  // limpa os campos após agendar
  definirDataMinima()
  repetirMensalmente.checked = false
  descricaoEventual.value = ''
}

// ===================================================
// FUNÇÃO AUXILIAR — ENVIAR AGENDAMENTO AO BACKEND
// reutilizada por agendarRecorrente e agendarEventual
// ===================================================

async function enviarAgendamento(cronExpressao, descricao, tipo) {
  try {

    btnAgendarRecorrente.disabled = true
    btnAgendarEventual.disabled   = true

    const resposta = await fetchAutenticado(`${API_URL}/backup/agendar`, {
      method: 'POST',
      body: JSON.stringify({ cronExpressao, descricao, tipo })
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao salvar agendamento.')
      return
    }

    mostrarSucesso('Agendamento salvo com sucesso!')

    // recarrega a lista de agendamentos
    carregarAgendamentos()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  } finally {
    btnAgendarRecorrente.disabled = false
    btnAgendarEventual.disabled   = false
  }
}

// ===================================================
// CARREGAR LISTA DE BACKUPS DISPONÍVEIS
// ===================================================

async function carregarBackups() {
  try {

    const resposta = await fetchAutenticado(`${API_URL}/backup/listar`)
    const dados    = await resposta.json()

    if (!resposta.ok) {
      listaBackups.innerHTML = '<p style="color:#e74c3c">Erro ao carregar backups.</p>'
      return
    }

    // atualiza o select do restore
    if (dados.backups.length === 0) {
      selectBackup.innerHTML  = '<option value="">-- Nenhum backup disponível --</option>'
      listaBackups.innerHTML  = '<p style="color:#999;font-size:14px">Nenhum backup encontrado.</p>'
      return
    }

    // preenche o select de restore com os backups disponíveis
    selectBackup.innerHTML = '<option value="">-- Selecione um backup --</option>' +
      dados.backups.map(b =>
        `<option value="${b.nome}">${b.nome} (${b.tamanho})</option>`
      ).join('')

    // renderiza a tabela de backups com botão de excluir
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
              <td>
                <button
                  class="btn btn-perigo btn-pequeno"
                  onclick="deletarBackup('${b.nome}')">
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
// CARREGAR LISTA DE AGENDAMENTOS
// ===================================================

async function carregarAgendamentos() {
  try {

    const resposta = await fetchAutenticado(`${API_URL}/backup/agendamentos`)
    const dados    = await resposta.json()

    if (!resposta.ok || dados.agendamentos.length === 0) {
      listaAgendamentos.innerHTML =
        '<p style="color:#999;font-size:13px;margin-top:16px">Nenhum agendamento configurado.</p>'
      return
    }

    listaAgendamentos.innerHTML = `
      <table style="margin-top:16px">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Expressão</th>
            <th>Último backup</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${dados.agendamentos.map(a => `
            <tr>
              <td>${a.descricao}</td>
              <td style="font-size:13px">
                ${a.tipo === 'recorrente' ? '🔁 Recorrente' : '📆 Eventual'}
              </td>
              <td><code>${a.cron_expressao}</code></td>
              <td style="font-size:13px">
                ${a.ultimo_backup
                  ? new Date(a.ultimo_backup).toLocaleString('pt-BR')
                  : 'Nunca executado'}
              </td>
              <td>
                <button
                  class="btn btn-perigo btn-pequeno"
                  onclick="removerAgendamento(${a.id})">
                  Remover
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

  } catch (erro) {
    listaAgendamentos.innerHTML =
      '<p style="color:#e74c3c;font-size:13px">Erro ao carregar agendamentos.</p>'
  }
}

// ===================================================
// RESTORE DO BANCO
// ===================================================

async function restaurarBackup() {

  const nomeArquivo = selectBackup.value

  if (!nomeArquivo) {
    mostrarErro('Selecione um backup para restaurar.')
    return
  }

  // confirmação dupla — operação destrutiva e irreversível
  const confirmado = confirm(
    `⚠️ ATENÇÃO!\n\n` +
    `Restaurar "${nomeArquivo}" irá substituir TODOS os dados atuais.\n\n` +
    `Essa ação não pode ser desfeita.\n\nDeseja continuar?`
  )
  if (!confirmado) return

  try {

    btnRestore.disabled     = true
    btnRestore.textContent  = '⏳ Restaurando...'

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
    btnRestore.disabled    = false
    btnRestore.textContent = '↩ Restaurar Banco'
  }
}

// ===================================================
// EXCLUIR BACKUP
// ===================================================

async function deletarBackup(nomeArquivo) {

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
    carregarBackups()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// REMOVER AGENDAMENTO
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
    // mesmo com erro no backend o logout local acontece
  } finally {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
  }
})

// ===================================================
// EVENTOS DOS BOTÕES
// ===================================================

btnBackupAgora.addEventListener('click', fazerBackupAgora)
btnAgendarRecorrente.addEventListener('click', agendarRecorrente)
btnAgendarEventual.addEventListener('click', agendarEventual)
btnRestore.addEventListener('click', restaurarBackup)

// expõe funções chamadas via onclick no HTML
window.deletarBackup      = deletarBackup
window.removerAgendamento = removerAgendamento

// ===================================================
// INICIALIZAÇÃO — carrega dados ao abrir a página
// ===================================================

carregarBackups()
carregarAgendamentos()