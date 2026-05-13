// ===================================================
// CONFIGURAÇÃO
// ===================================================

// URL base do backend
// todos os fetchs usarão essa constante
// se mudar a porta ou o endereço, muda só aqui

// DESENVOLVIMENTO LOCAL — sem Docker
const API_URL = 'http://localhost:3000'

// PRODUÇÃO — com Docker e Nginx
// const API_URL = '/api'

// ===================================================
// VERIFICAÇÃO — SE JÁ ESTÁ LOGADO
// ===================================================

// quando a página de login carrega, verificamos
// se já existe um token salvo
// se sim, não faz sentido mostrar o login de novo
// redirecionamos direto para a página principal
const tokenExistente = localStorage.getItem('token')
if (tokenExistente) {
  window.location.href = 'usuarios.html'
}

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
      headers: {
        'Content-Type': 'application/json'
      },

      // converte o objeto JS para string JSON
      // { username: 'joao', password: '123' }
      // vira '{"username":"joao","password":"123"}'
      body: JSON.stringify({ username, password })
    })

    // converte a resposta do backend para objeto JS
    const dados = await resposta.json()

    // resposta com status 200-299 é considerada sucesso
    // qualquer outro status (401, 403, 500) é erro
    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao fazer login.')
      return
    }

    // login bem sucedido
    // salva o token e os dados do usuário no localStorage
    // o localStorage persiste mesmo fechando o browser
    localStorage.setItem('token', dados.token)
    localStorage.setItem('usuario', JSON.stringify(dados.usuario))

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