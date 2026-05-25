// ===================================================
// API.JS
// Utilitário de fetch autenticado
// O cookie HttpOnly é enviado automaticamente
// pelo browser em toda requisição com credentials: include
// Não é necessário ler ou enviar o token manualmente
// ===================================================


// ===================================================
// CONFIGURAÇÃO
// ===================================================


//const API_URL definida em /frontend/js/config.js para ser usada 
// em todos os outros arquivos de frontend


// ===================================================
// VERIFICAR AUTENTICAÇÃO
// busca os dados do usuário no backend
// via cookie HttpOnly — não confia no localStorage
// se alguém manipulou o role no localStorage
// essa função sobrescreve com o valor real do token
// ===================================================

async function verificarAutenticacao(requerAdmin = false) {
  try {

    const resposta = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include'
    })

    // cookie inválido ou expirado
    if (!resposta.ok) {
      localStorage.removeItem('usuario')
      window.location.href = 'login.html'
      return null
    }

    const dados = await resposta.json()

    // sobrescreve o localStorage com dados reais do token
    // elimina qualquer manipulação feita pelo usuário
    localStorage.setItem('usuario', JSON.stringify(dados.usuario))

    // verifica se a página requer admin
    if (requerAdmin && dados.usuario.role !== 'admin') {
      window.location.href = 'usuarios.html'
      return null
    }

    return dados.usuario

  } catch (erro) {
    // erro de rede — redireciona para login
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
    return null
  }
}

// ===================================================
// FETCH AUTENTICADO
// função reutilizável para fetch autenticado
// credentials: include envia o cookie automaticamente
// redireciona para login se token expirar (401)
// ===================================================
async function fetchAutenticado(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    credentials: 'include', // envia o cookie HttpOnly
    headers: {
      'Content-Type': 'application/json',
      ...opcoes.headers
    }
  })

  // cookie expirou ou é inválido
  if (resposta.status === 401) {
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
    return
  }

  return resposta
}

// ===================================================
// OBTER USUÁRIO LOGADO
// lê do localStorage — usado APENAS para exibição ex: nome na navbar
// NUNCA usar para decisões de segurança
// token não fica mais no localStorage
// ===================================================

function obterUsuarioLogado() {
  return JSON.parse(localStorage.getItem('usuario') || 'null')
}

// ===================================================
// FAZER LOGOUT
// limpa o cookie no backend e o localStorage
// ===================================================
async function fazerLogout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'// envia o cookie para o backend limpar a sessão
    })
  } catch (erro) {
    // mesmo com erro faz logout local
  } finally {
    localStorage.removeItem('usuario')
    window.location.href = 'login.html'
  }
}