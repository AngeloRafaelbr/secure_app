// ===================================================
// CONFIGURAÇÃO
// ===================================================

// DESENVOLVIMENTO LOCAL — sem Docker
//const API_URL = 'http://localhost:3000'

// PRODUÇÃO — com Docker e Nginx
 const API_URL = '/api'

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO
// ===================================================

const token = localStorage.getItem('token')
const usuarioLogado = JSON.parse(localStorage.getItem('usuario') || 'null')

if (!token || !usuarioLogado) {
  window.location.href = 'login.html'
}

// ===================================================
// LÊ O ID DA URL
// ===================================================

// a URL chega como: usuarios-editar.html?id=3
// URLSearchParams permite ler os parâmetros da URL
// window.location.search retorna a parte "?id=3"
const params = new URLSearchParams(window.location.search)
const idUsuario = params.get('id')

// se não veio id na URL, volta para a listagem
if (!idUsuario) {
  window.location.href = 'usuarios.html'
}

// usuário comum só pode editar a si mesmo
// se o id da URL for diferente do id do usuário logado
// e não for admin, redireciona
if (usuarioLogado.role !== 'admin' && parseInt(idUsuario) !== usuarioLogado.id) {
  window.location.href = 'usuarios.html'
}

// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

const inputUsername = document.getElementById('username')
const inputEmail = document.getElementById('email')
const inputRole = document.getElementById('role')
const inputPassword = document.getElementById('password')
const inputConfirmar = document.getElementById('confirmarSenha')
const btnSalvar = document.getElementById('btnSalvar')
const btnSair = document.getElementById('btnSair')
const nomeUsuario = document.getElementById('nomeUsuario')
const mensagemErro = document.getElementById('mensagemErro')
const mensagemSucesso = document.getElementById('mensagemSucesso')
const campoPerfil = document.getElementById('campoPerfil')

// ===================================================
// CONFIGURAÇÃO DA NAVBAR E PERMISSÕES
// ===================================================

nomeUsuario.textContent = `👤 ${usuarioLogado.username}`

// usuário comum não pode alterar o próprio perfil
// esconde o campo de perfil se não for admin
if (usuarioLogado.role !== 'admin') {
  campoPerfil.style.display = 'none'
}

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

// ===================================================
// FUNÇÃO — CARREGAR DADOS DO USUÁRIO
// ===================================================

async function carregarUsuario() {
  try {

    const resposta = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (resposta.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = 'login.html'
      return
    }

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao carregar dados do usuário.')
      return
    }

    // preenche os campos com os dados do usuário
    // que vieram do banco via backend
    inputUsername.value = dados.usuario.username
    inputEmail.value = dados.usuario.email
    inputRole.value = dados.usuario.role

    // campos de senha ficam sempre vazios
    // o usuário preenche só se quiser trocar

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// VALIDAÇÃO NO FRONTEND
// ===================================================

function validarFormulario() {

  const username = inputUsername.value.trim()
  const email = inputEmail.value.trim()
  const password = inputPassword.value
  const confirmar = inputConfirmar.value

  if (!username) {
    mostrarErro('Username é obrigatório.')
    inputUsername.focus()
    return false
  }

  if (!email) {
    mostrarErro('Email é obrigatório.')
    inputEmail.focus()
    return false
  }

  // validação de senha só se o usuário
  // preencheu o campo — é opcional na edição
  if (password) {

    if (password.length < 10) {
      mostrarErro('A senha deve ter no mínimo 10 caracteres.')
      inputPassword.focus()
      return false
    }

    if (password !== confirmar) {
      mostrarErro('As senhas não coincidem.')
      inputConfirmar.focus()
      return false
    }
  }

  return true
}

// ===================================================
// FUNÇÃO PRINCIPAL — SALVAR ALTERAÇÕES
// ===================================================

async function salvarAlteracoes() {

  if (!validarFormulario()) return

  const username = inputUsername.value.trim()
  const email = inputEmail.value.trim()
  const role = inputRole.value
  const password = inputPassword.value

  // monta o objeto com os dados a enviar
  // só inclui a senha se foi preenchida
  const dadosParaEnviar = { username, email, role }
  if (password) {
    dadosParaEnviar.password = password
  }

  try {

    btnSalvar.disabled = true
    btnSalvar.textContent = 'Salvando...'

    const resposta = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dadosParaEnviar)
    })

    const dados = await resposta.json()

    if (resposta.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = 'login.html'
      return
    }

    if (!resposta.ok) {
      if (dados.detalhes && dados.detalhes.length > 0) {
        mostrarErro(dados.detalhes.join(' '))
      } else {
        mostrarErro(dados.erro || 'Erro ao atualizar usuário.')
      }
      return
    }

    mostrarSucesso('Usuário atualizado com sucesso! Redirecionando...')

    setTimeout(() => {
      window.location.href = 'usuarios.html'
    }, 1500)

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    btnSalvar.disabled = false
    btnSalvar.textContent = 'Salvar Alterações'
  }
}

// ===================================================
// LOGOUT
// ===================================================

btnSair.addEventListener('click', async (e) => {
  e.preventDefault()
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
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

btnSalvar.addEventListener('click', salvarAlteracoes)

inputConfirmar.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') salvarAlteracoes()
})

// ===================================================
// INICIALIZAÇÃO
// ===================================================

// carrega os dados do usuário quando a página abre
carregarUsuario()