// ===================================================
// CONFIGURAÇÃO
// ===================================================

//const API_URL = '' puxada de api.js devido função concetrador de fetchs
//(Exceto login.js)

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO E PERMISSÃO e CONFIGURAÇÃO DA NAVBAR
// ===================================================

verificarAutenticacao(true).then(usuario => {
  if (!usuario) return
  nomeUsuario.textContent = `👤 ${usuario.username}`

  carregarLogs()
})

// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

const areaLogs = document.getElementById('areaLogs')
const totalLogs = document.getElementById('totalLogs')
const selectTipo = document.getElementById('tipoLog')
const selectLimite = document.getElementById('limite')
const btnCarregar = document.getElementById('btnCarregar')
const btnSair = document.getElementById('btnSair')
const nomeUsuario = document.getElementById('nomeUsuario')
const mensagemErro = document.getElementById('mensagemErro')

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
}

// ===================================================
// FUNÇÃO PRINCIPAL — CARREGAR LOGS
// ===================================================

async function carregarLogs() {
  try {

    btnCarregar.disabled = true
    btnCarregar.textContent = '⏳ Carregando...'

    const tipo = selectTipo.value
    const limite = selectLimite.value

    // define o endpoint baseado no tipo selecionado
    // tipo 'erros' → GET /logs/erros
    // tipo 'geral' → GET /logs
    const endpoint = tipo === 'erros'
      ? `${API_URL}/logs/erros?limite=${limite}`
      : `${API_URL}/logs?limite=${limite}`

    const resposta = await fetchAutenticado(endpoint, {
      method: 'GET',
    })

    // token expirou
    if (resposta.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = 'login.html'
      return
    }

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao carregar logs.')
      return
    }

    // se não houver logs ainda
    if (dados.logs.length === 0) {
      areaLogs.value = 'Nenhum evento registrado ainda.'
      totalLogs.textContent = '0 eventos'
      return
    }

    // junta todas as linhas com quebra de linha
    // e exibe na textarea
    areaLogs.value = dados.logs.join('\n')

    // mostra o total de linhas exibidas
    totalLogs.textContent = `${dados.total} evento(s) exibido(s)`

    // rola o textarea para o topo
    // pois os logs já vêm do mais recente para o mais antigo
    areaLogs.scrollTop = 0

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
    areaLogs.value = 'Erro ao carregar logs.'

  } finally {
    btnCarregar.disabled = false
    btnCarregar.textContent = '🔄 Atualizar'
  }
}

// ===================================================
// LOGOUT
// ===================================================

btnSair.addEventListener('click', (e) => {
  e.preventDefault()
  fazerLogout() // função do api.js
})

// ===================================================
// EVENTOS
// ===================================================

btnCarregar.addEventListener('click', carregarLogs)

// recarrega automaticamente quando muda o tipo ou o limite
selectTipo.addEventListener('change', carregarLogs)
selectLimite.addEventListener('change', carregarLogs)

// ===================================================
// INICIALIZAÇÃO
// ===================================================

carregarLogs()