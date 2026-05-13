// ===================================================
// SISTEMAS.JS
// Lógica da página de Sistemas Integrados
// Responsabilidades:
//   - Listar sistemas cadastrados
//   - Cadastrar novo sistema
//   - Exibir api_key gerada (apenas uma vez)
//   - Verificar status online/offline de cada sistema
//   - Remover sistema
//   - Regenerar api_key
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

if (!token || !usuarioLogado) {
  window.location.href = 'login.html'
}

// apenas admin acessa sistemas
if (usuarioLogado.role !== 'admin') {
  window.location.href = 'usuarios.html'
}

// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

const nomeUsuario    = document.getElementById('nomeUsuario')
const btnSair        = document.getElementById('btnSair')
const mensagemErro   = document.getElementById('mensagemErro')
const mensagemSucesso = document.getElementById('mensagemSucesso')
const btnNovo        = document.getElementById('btnNovo')
const formNovo       = document.getElementById('formNovo')
const btnCancelarNovo = document.getElementById('btnCancelarNovo')
const btnSalvarNovo  = document.getElementById('btnSalvarNovo')
const inputNome      = document.getElementById('nomeNovo')
const inputUrl       = document.getElementById('urlNovo')
const listaSistemas  = document.getElementById('listaSistemas')
const modalApiKey    = document.getElementById('modalApiKey')
const apiKeyGerada   = document.getElementById('apiKeyGerada')
const btnCopiarChave = document.getElementById('btnCopiarChave')
const btnFecharModal = document.getElementById('btnFecharModal')

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
// CONTROLE DO FORMULÁRIO DE NOVO SISTEMA
// ===================================================

// exibe o formulário de cadastro
btnNovo.addEventListener('click', () => {
  formNovo.style.display = 'block'
  modalApiKey.style.display = 'none'
  inputNome.focus()
  window.scrollTo(0, 0)
})

// esconde o formulário sem salvar
btnCancelarNovo.addEventListener('click', () => {
  formNovo.style.display = 'none'
  inputNome.value = ''
  inputUrl.value = ''
})

// ===================================================
// CONTROLE DO MODAL DA API_KEY
// ===================================================

// fecha o modal e recarrega a lista de sistemas
btnFecharModal.addEventListener('click', () => {
  modalApiKey.style.display = 'none'
  carregarSistemas()
})

// copia a api_key para a área de transferência
btnCopiarChave.addEventListener('click', () => {
  const chave = apiKeyGerada.textContent

  navigator.clipboard.writeText(chave).then(() => {
    btnCopiarChave.textContent = '✅ Copiado!'
    setTimeout(() => {
      btnCopiarChave.textContent = '📋 Copiar API Key'
    }, 2000)
  })
})

// ===================================================
// CADASTRAR NOVO SISTEMA
// ===================================================

async function cadastrarSistema() {

  const nome = inputNome.value.trim()
  const url  = inputUrl.value.trim()

  if (!nome) {
    mostrarErro('Nome do sistema é obrigatório.')
    inputNome.focus()
    return
  }

  if (!url) {
    mostrarErro('URL do endpoint é obrigatória.')
    inputUrl.focus()
    return
  }

  try {

    btnSalvarNovo.disabled = true
    btnSalvarNovo.textContent = 'Cadastrando...'

    const resposta = await fetchAutenticado(`${API_URL}/sistemas`, {
      method: 'POST',
      body: JSON.stringify({ nome, url })
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao cadastrar sistema.')
      return
    }

    // esconde o formulário
    formNovo.style.display = 'none'
    inputNome.value = ''
    inputUrl.value = ''

    // exibe o modal com a api_key gerada
    // essa é a única vez que a chave é exibida
    apiKeyGerada.textContent = dados.apiKey
    modalApiKey.style.display = 'block'
    window.scrollTo(0, 0)

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  } finally {
    btnSalvarNovo.disabled = false
    btnSalvarNovo.textContent = 'Cadastrar'
  }
}

// ===================================================
// CARREGAR LISTA DE SISTEMAS
// ===================================================

async function carregarSistemas() {
  try {

    const resposta = await fetchAutenticado(`${API_URL}/sistemas`)
    const dados    = await resposta.json()

    if (!resposta.ok) {
      listaSistemas.innerHTML =
        '<p style="color:#e74c3c">Erro ao carregar sistemas.</p>'
      return
    }

    if (dados.sistemas.length === 0) {
      listaSistemas.innerHTML = `
        <p style="color:#999;font-size:14px">
          Nenhum sistema integrado cadastrado.
          Clique em "+ Cadastrar Sistema" para adicionar.
        </p>
      `
      return
    }

    // renderiza a tabela com os sistemas
    // status começa como "verificando" e é atualizado
    // individualmente por verificarStatus()
    listaSistemas.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Sistema</th>
            <th>URL</th>
            <th>Status</th>
            <th>Cadastrado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${dados.sistemas.map(s => `
            <tr id="linha-${s.id}">
              <td><strong>${s.nome}</strong></td>
              <td style="font-size:13px">
                <code>${s.url}</code>
              </td>
              <td id="status-${s.id}">
                <span class="badge-verificando">⏳ Verificando...</span>
              </td>
              <td style="font-size:13px">
                ${new Date(s.criado_em).toLocaleString('pt-BR')}
              </td>
              <td class="acoes">
                <button
                  class="btn btn-neutro btn-pequeno"
                  onclick="regenerarChave(${s.id}, '${s.nome}')">
                  🔑 Nova Chave
                </button>
                <button
                  class="btn btn-perigo btn-pequeno"
                  onclick="removerSistema(${s.id}, '${s.nome}')">
                  Remover
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `

    // verifica o status de cada sistema em paralelo
    // atualiza cada linha individualmente conforme responde
    dados.sistemas.forEach(s => verificarStatus(s.id))

  } catch (erro) {
    listaSistemas.innerHTML =
      '<p style="color:#e74c3c">Erro ao conectar ao servidor.</p>'
  }
}

// ===================================================
// VERIFICAR STATUS DE UM SISTEMA
// atualiza a célula de status individualmente
// chamada para cada sistema após renderizar a tabela
// ===================================================

async function verificarStatus(id) {
  try {

    const resposta = await fetchAutenticado(
      `${API_URL}/sistemas/${id}/status`
    )
    const dados = await resposta.json()

    const celula = document.getElementById(`status-${id}`)
    if (!celula) return

    if (dados.status === 'online') {
      celula.innerHTML = '<span class="badge-online">✅ Online</span>'
    } else {
      celula.innerHTML = '<span class="badge-offline">⚠️ Offline</span>'
    }

  } catch (erro) {
    const celula = document.getElementById(`status-${id}`)
    if (celula) {
      celula.innerHTML = '<span class="badge-offline">⚠️ Offline</span>'
    }
  }
}

// ===================================================
// REGENERAR API_KEY DE UM SISTEMA
// ===================================================

async function regenerarChave(id, nome) {

  const confirmado = confirm(
    `Deseja gerar uma nova API Key para "${nome}"?\n\n` +
    `A chave atual será invalidada imediatamente.\n` +
    `O sistema externo precisará ser atualizado com a nova chave.`
  )
  if (!confirmado) return

  try {

    const resposta = await fetchAutenticado(
      `${API_URL}/sistemas/${id}/regenerar-chave`,
      { method: 'POST' }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao regenerar chave.')
      return
    }

    // exibe o modal com a nova chave
    apiKeyGerada.textContent = dados.apiKey
    modalApiKey.style.display = 'block'
    window.scrollTo(0, 0)

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// REMOVER SISTEMA
// ===================================================

async function removerSistema(id, nome) {

  const confirmado = confirm(
    `Deseja remover o sistema "${nome}"?\n\n` +
    `O sistema não conseguirá mais verificar tokens no SecureApp.\n` +
    `Essa ação não pode ser desfeita.`
  )
  if (!confirmado) return

  try {

    const resposta = await fetchAutenticado(
      `${API_URL}/sistemas/${id}`,
      { method: 'DELETE' }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao remover sistema.')
      return
    }

    mostrarSucesso(`Sistema "${nome}" removido com sucesso.`)
    carregarSistemas()

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

btnSalvarNovo.addEventListener('click', cadastrarSistema)

// expõe funções chamadas via onclick no HTML
window.verificarStatus  = verificarStatus
window.regenerarChave   = regenerarChave
window.removerSistema   = removerSistema

// ===================================================
// INICIALIZAÇÃO
// ===================================================

carregarSistemas()