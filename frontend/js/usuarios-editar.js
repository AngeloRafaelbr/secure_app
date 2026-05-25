// ===================================================
// CONFIGURAÇÃO
// ===================================================

//const API_URL = '' puxada de api.js devido função concetrador de fetchs
//(Exceto login.js)

// ===================================================
// VERIFICAÇÃO DE AUTENTICAÇÃO e CONFIGURAÇÃO DA NAVBAR E PERMISSÕES
// ===================================================

let usuarioLogado = null

verificarAutenticacao(false).then(usuario => {
  if (!usuario) return
  usuarioLogado = usuario
  nomeUsuario.textContent = `👤 ${usuario.username}`

  // usuário comum só edita a si mesmo
  if (usuario.role !== 'admin' && parseInt(idUsuario) !== usuario.id) {
    window.location.href = 'usuarios.html'
    return
  }

  // esconde campo perfil para não admin
  if (usuario.role !== 'admin') {
    campoPerfil.style.display = 'none'
  }

  // carrega os dados após confirmar autenticação
  carregarUsuario()
})
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
const listaAcessos = document.getElementById('listaAcessos')

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

    const resposta = await fetchAutenticado(`${API_URL}/usuarios/${idUsuario}`, {
      method: 'GET',
    })

    const dados = await resposta.json()

    if (!resposta.ok) {
      mostrarErro(dados.erro || 'Erro ao carregar dados do usuário.')
      return
    }

     // preenche os campos com os dados do usuário
    inputUsername.value = dados.usuario.username
    inputEmail.value    = dados.usuario.email
    inputRole.value     = dados.usuario.role

    // como identificador universal nos sistemas externos
    carregarAcessos(dados.usuario.email)


  } catch (erro) {
    mostrarErro('Não foi possível conectar ao servidor.')
  }
}

// ===================================================
// FUNÇÃO — CARREGAR ACESSOS EM SISTEMAS INTEGRADOS
// consulta em tempo real o nível de acesso do usuário
// em cada sistema integrado ao SecureApp
// usa o email do usuário como identificador universal
// ===================================================

async function carregarAcessos(email) {
  try {

    // consulta o backend que por sua vez
    // consulta cada sistema externo em paralelo
    const resposta = await fetchAutenticado(
      `${API_URL}/sistemas/acessos/${encodeURIComponent(email)}`,{
      method: 'GET',
      }
    )

    const dados = await resposta.json()

    if (!resposta.ok) {
      listaAcessos.innerHTML =
        '<p style="color:#e74c3c;font-size:14px">Erro ao carregar acessos.</p>'
      return
    }

    // se não houver sistemas cadastrados
    if (!dados.acessos || dados.acessos.length === 0) {
      listaAcessos.innerHTML = `
        <p style="color:#999;font-size:14px">
          Nenhum sistema integrado cadastrado.
          <a href="sistemas.html">Cadastrar sistemas</a>
        </p>
      `
      return
    }

    // renderiza a tabela de acessos
    listaAcessos.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Sistema</th>
            <th>Nível de Acesso</th>
            <th>Disponibilidade</th>
          </tr>
        </thead>
        <tbody>
          ${dados.acessos.map(a => {

            // define o badge de nível baseado no valor retornado
            // o nível é texto livre — cada sistema define o seu
            // fazemos uma comparação case-insensitive para os casos comuns
            const nivelLower = (a.nivel || '').toLowerCase()

            let badgeClasse = 'badge-nivel-usuario'
            if (nivelLower === 'admin' || nivelLower === 'administrador') {
              badgeClasse = 'badge-nivel-admin'
            } else if (nivelLower === 'desabilitado' || nivelLower === 'inativo') {
              badgeClasse = 'badge-nivel-desabilitado'
            }

            // se o sistema está offline — exibe aviso
            if (a.status === 'offline') {
              return `
                <tr>
                  <td><strong>${a.sistema}</strong></td>
                  <td>—</td>
                  <td>
                    <span class="badge-nivel badge-nivel-offline">
                      ⚠️ Sistema não respondendo
                    </span>
                    <span style="font-size:12px;color:#999;display:block;margin-top:4px">
                      Favor contatar o administrador do sistema.
                    </span>
                  </td>
                </tr>
              `
            }

            // sistema online — exibe o nível retornado
            return `
              <tr>
                <td><strong>${a.sistema}</strong></td>
                <td>
                  <span class="badge-nivel ${badgeClasse}">
                    ${a.nivel}
                  </span>
                </td>
                <td>
                  <span style="color:#27ae60;font-size:13px">
                    ✅ Online
                  </span>
                </td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
      <p style="font-size:12px;color:#999;margin-top:12px">
        🕐 Consultado em: ${new Date().toLocaleString('pt-BR')}
        <button
          onclick="carregarAcessos('${email}')"
          class="btn btn-neutro btn-pequeno"
          style="margin-left:10px">
          🔄 Atualizar
        </button>
      </p>
    `

  } catch (erro) {
    listaAcessos.innerHTML =
      '<p style="color:#e74c3c;font-size:14px">Não foi possível consultar os sistemas.</p>'
  }
}

// expõe para o onclick do botão atualizar
window.carregarAcessos = carregarAcessos

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
      body: JSON.stringify(dadosParaEnviar)
    })

    const dados = await resposta.json()

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

btnSair.addEventListener('click', (e) => {
  e.preventDefault()
  fazerLogout() // função do api.js
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