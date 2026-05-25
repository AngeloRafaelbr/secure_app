// ===================================================
// CONFIGURAÇÃO
// ===================================================

//const API_URL = '' puxada de api.js devido função concetrador de fetchs
//(Exceto login.js)

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO e CONFIGURAÇÃO BASEADA NO PERFIL
// ===================================================

//!!não é mais necessario verificar o token manualmente, o fetchAutenticado já cuida disso!!
// verificarAutenticacao() busca o role do backend
// false = não requer admin — qualquer logado acessa
let usuarioLogado = null

verificarAutenticacao(false).then(usuario => {
  if (!usuario) return // já redirecionou
  usuarioLogado = usuario
  nomeUsuario.textContent = `👤 ${usuario.username}`

  // configura a interface baseado no role REAL do token
  if (usuario.role !== 'admin') {
    btnNovo.style.display = 'none'
    colunaAcoes.style.display = 'none'
  }

  // carrega os dados após confirmar autenticação
  carregarUsuarios()
})


// ===================================================
// REFERÊNCIAS AOS ELEMENTOS DO HTML
// ===================================================

const corpoTabela = document.getElementById('corpoTabela')
const mensagemErro = document.getElementById('mensagemErro')
const mensagemSucesso = document.getElementById('mensagemSucesso')
const btnNovo = document.getElementById('btnNovo')
const btnSair = document.getElementById('btnSair')
const nomeUsuario = document.getElementById('nomeUsuario')
const colunaAcoes = document.getElementById('colunaAcoes')

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem
  mensagemErro.style.display = 'block'
  mensagemSucesso.style.display = 'none'
}

function mostrarSucesso(mensagem) {
  mensagemSucesso.textContent = mensagem
  mensagemSucesso.style.display = 'block'
  mensagemErro.style.display = 'none'
}

// formata a data que vem do banco
// ex: "2024-01-15T10:30:00.000Z" → "15/01/2024 10:30"
function formatarData(dataString) {
  if (!dataString) return '-'
  const data = new Date(dataString)
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ===================================================
// FUNÇÃO PRINCIPAL — CARREGAR USUÁRIOS
// ===================================================

async function carregarUsuarios() {
  try {
    
    const resposta = await fetchAutenticado(`${API_URL}/usuarios`, {
      method: 'GET',
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao carregar usuários.')
      return
    }

    renderizarTabela(dados.usuarios)

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// FUNÇÃO — RENDERIZAR A TABELA
// ===================================================

function renderizarTabela(usuarios) {

  // se não houver usuários
  if (usuarios.length === 0) {
    corpoTabela.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:#999">
          Nenhum usuário encontrado.
        </td>
      </tr>
    `
    return
  }

  // monta o HTML de todas as linhas
  // map retorna um array de strings HTML
  // join('') junta tudo em uma string só
  corpoTabela.innerHTML = usuarios.map(usuario => {

    // define o badge de perfil
    const badgePerfil = usuario.role === 'admin'
      ? '<span class="badge badge-admin">Admin</span>'
      : '<span class="badge badge-user">Usuário</span>'

    // define o status — bloqueado ou ativo
    const status = usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()
      ? '<span style="color:#e74c3c;font-size:13px">🔒 Bloqueado</span>'
      : '<span style="color:#27ae60;font-size:13px">✔ Ativo</span>'

    // botões de ação — só renderiza para admin
    const acoes = usuarioLogado.role === 'admin'
      ? `
        <td class="acoes">
          <a href="usuarios-editar.html?id=${usuario.id}" class="btn btn-primario btn-pequeno">
            Editar
          </a>
          ${usuario.id !== usuarioLogado.id
            ? `<button class="btn btn-perigo btn-pequeno" onclick="excluirUsuario(${usuario.id}, '${usuario.username}')">
                Excluir
               </button>`
            : ''
          }
        </td>
      `
      : '<td></td>'

    return `
      <tr>
        <td>${usuario.username}</td>
        <td>${usuario.email}</td>
        <td>${badgePerfil}</td>
        <td>${status}</td>
        <td style="font-size:13px">${formatarData(usuario.criado_em)}</td>
        ${acoes}
      </tr>
    `
  }).join('')
}

// ===================================================
// FUNÇÃO — EXCLUIR USUÁRIO
// ===================================================

async function excluirUsuario(id, username) {

  // pede confirmação antes de excluir
  const confirmado = confirm(`Deseja excluir o usuário "${username}"?\nEssa ação não pode ser desfeita.`)
  if (!confirmado) return

  try {

    const resposta = await fetchAutenticado(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao excluir usuário.')
      return
    }

    mostrarSucesso(`Usuário "${username}" excluído com sucesso.`)

    // recarrega a tabela após excluir
    carregarUsuarios()

  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
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
// INICIALIZAÇÃO
// ===================================================

// carrega os usuários quando a página abre
carregarUsuarios()