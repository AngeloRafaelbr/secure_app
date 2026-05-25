// ===================================================
// CONFIGURAÇÃO
// ===================================================

//const API_URL = '' puxada de api.js devido função concetrador de fetchs
//(Exceto login.js)

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO E PERMISSÃO e CONFIGURAÇÃO DA NAVBAR
// ===================================================

//!!não é mais necessario verificar o token manualmente, o fetchAutenticado já cuida disso!!
let usuarioLogado = null

// true = requer admin
// se não for admin redireciona para usuarios.html
verificarAutenticacao(true).then(usuario => {
  if (!usuario) return
  usuarioLogado = usuario
  nomeUsuario.textContent = `👤 ${usuario.username}`
})

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

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
  mensagemSucesso.style.display = 'none'

  // rola a página para o topo para garantir
  // que o usuário veja a mensagem de erro
  window.scrollTo(0, 0)
}

function mostrarSucesso(mensagem) {
  mensagemSucesso.textContent = mensagem
  mensagemSucesso.style.display = 'block'
  mensagemErro.style.display = 'none'
  window.scrollTo(0, 0)
}

// ===================================================
// VALIDAÇÃO NO FRONTEND
// ===================================================

// fazemos uma validação básica no frontend também
// isso não substitui a validação do backend
// mas evita requisições desnecessárias para erros
// simples como campos vazios ou senhas que não batem
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

  if (!password) {
    mostrarErro('Senha é obrigatória.')
    inputPassword.focus()
    return false
  }

  // verifica se as senhas coincidem antes de
  // mandar para o backend — erro mais rápido
  if (password !== confirmar) {
    mostrarErro('As senhas não coincidem.')
    inputConfirmar.focus()
    return false
  }

  // verificação básica do tamanho mínimo
  // a validação completa da política fica no backend
  if (password.length < 10) {
    mostrarErro('A senha deve ter no mínimo 10 caracteres.')
    inputPassword.focus()
    return false
  }

  return true
}

// ===================================================
// FUNÇÃO PRINCIPAL — SALVAR USUÁRIO
// ===================================================

async function salvarUsuario() {

  if (!validarFormulario()) return

  const username = inputUsername.value.trim()
  const email = inputEmail.value.trim()
  const role = inputRole.value
  const password = inputPassword.value

  try {

    btnSalvar.disabled = true
    btnSalvar.textContent = 'Salvando...'

    const resposta = await fetchAutenticado(`${API_URL}/usuarios`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, role })
   })

    const dados = await resposta.json()

    if (!resposta.ok) {
      // o backend pode retornar erros detalhados
      // da política de senha em dados.detalhes
      if (dados.detalhes && dados.detalhes.length > 0) {
        mostrarErro(dados.detalhes.join(' '))
      } else {
        mostrarErro(dados.erro || 'Erro ao cadastrar usuário.')
      }
      return
    }

    // sucesso — mostra mensagem e redireciona
    mostrarSucesso('Usuário cadastrado com sucesso! Redirecionando...')

    // aguarda 1.5 segundos para o usuário ver a mensagem
    // antes de redirecionar
    setTimeout(() => {
      window.location.href = 'usuarios.html'
    }, 1500)

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    btnSalvar.disabled = false
    btnSalvar.textContent = 'Salvar'
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

btnSalvar.addEventListener('click', salvarUsuario)

// permite salvar com Enter no último campo
inputConfirmar.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') salvarUsuario()
})