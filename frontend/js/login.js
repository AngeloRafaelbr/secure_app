// ===================================================
// CONFIGURAÇÃO
// ===================================================

//const API_URL definida em /frontend/js/config.js para ser usada 
// em todos os outros arquivos de frontend

// ===================================================
// VERIFICAÇÃO — SE JÁ ESTÁ LOGADO
// ===================================================

// verifica se já está logado, tentando buscar os dados do usuário no backend
// se o cookie existir, responde com sucesso
async function verificarSessaoAtiva() {
  try {
    const resposta = await fetch(`${API_URL}/auth/me`, { 
      credentials: 'include' // envia o cookie automaticamente
    })
    if (resposta.ok) {
      window.location.href = 'usuarios.html'
    }
  } catch (erro) {
    // não está logado — fica na tela de login
  }
}

verificarSessaoAtiva()

// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

// pegamos os elementos pelo id que definimos no HTML
// guardamos em variáveis para não precisar chamar
// document.getElementById toda vez
const inputUsername = document.getElementById('username')
const inputPassword = document.getElementById('password')
const btnLogin = document.getElementById('btnLogin')
const mensagemErro = document.getElementById('mensagemErro')

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

// exibe a mensagem de erro na tela
function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
}

// esconde a mensagem de erro
function esconderErro() {
  mensagemErro.style.display = 'none'
}

// ===================================================
// FUNÇÃO PRINCIPAL — FAZER LOGIN
// ===================================================

async function fazerLogin() {
  // esconde erro anterior se houver
  esconderErro()

  const username = inputUsername.value.trim()
  const password = inputPassword.value

  // validação básica no frontend
  // evita mandar requisição com campos vazios
  if (!username || !password) {
    mostrarErro('Preencha o usuário e a senha.')
    return
  }

  try {
    // desabilita o botão para evitar cliques duplos
    // enquanto a requisição está em andamento
    btnLogin.disabled = true
    btnLogin.textContent = 'Entrando...'

    const resposta = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',

      // informa ao backend que estamos enviando JSON
      headers: {'Content-Type': 'application/json'},

      // credentials: include instrui o browser a aceitar e guardar o cookie que o backend enviar
      credentials: 'include',

      body: JSON.stringify({ username, password })
    })

    // converte a resposta do backend para objeto JS
    const dados = await resposta.json()

    // resposta com status 200-299 é considerada sucesso qualquer outro status (401, 403, 500) é erro
    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao fazer login.')
      return
    }

    // LOGIN BEM SUCEDIDO!
    // salva o token e os dados do usuário no localStorage, persiste mesmo fechando o browser
    localStorage.setItem('usuario', JSON.stringify(dados.usuario))
    // o token é armazenado como cookie HttpOnly, conforme linha res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'strict' }) no backend
    // o JavaScript não tem acesso a ele por questões de segurança

    // redireciona para a página principal
    window.location.href = 'usuarios.html'

  } catch (erro) {
    // esse catch pega erros de rede
    // ex: backend fora do ar, sem internet
    mostrarErro('Não foi possível conectar ao servidor.')

  } finally {
    // finally sempre executa — com sucesso ou erro
    // reabilita o botão independente do resultado
    btnLogin.disabled = false
    btnLogin.textContent = 'Entrar'
  }
}

// ===================================================
// EVENTOS
// ===================================================

// clique no botão de login
btnLogin.addEventListener('click', fazerLogin)

// permite fazer login pressionando Enter
// em qualquer campo do formulário
inputPassword.addEventListener('keypress', (evento) => {
  // evento.key retorna a tecla pressionada
  if (evento.key === 'Enter') {
    fazerLogin()
  }
})

inputUsername.addEventListener('keypress', (evento) => {
  if (evento.key === 'Enter') {
    fazerLogin()
  }
})