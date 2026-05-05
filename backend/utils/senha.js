// ===================================================
// IMPORTAÇÕES
// ===================================================

// bcryptjs — biblioteca para gerar hash de senhas
// usamos a versão 'js' pois não precisa compilar
// código nativo, funciona igual no Windows e Linux
const bcrypt = require('bcryptjs')

// ===================================================
// VALIDAÇÃO DA POLÍTICA DE SENHA
// ===================================================

// requisitos 4.1, 4.2 e 4.3
// recebe a senha e retorna um objeto com:
//   valida: true ou false
//   erros: array com as mensagens de erro encontradas
function validarSenha(senha) {

  // array que vai acumulando os erros encontrados
  const erros = []

  // requisito 4.1 — mínimo 10 caracteres
  if (!senha || senha.length < 10) {
    erros.push('A senha deve ter no mínimo 10 caracteres.')
  }

  // requisito 4.3 — pelo menos uma letra maiúscula
  // [A-Z] é uma expressão regular que verifica
  // se existe pelo menos um caractere entre A e Z
  // o .test() retorna true ou false
  if (!/[A-Z]/.test(senha)) {
    erros.push('A senha deve conter pelo menos uma letra maiúscula.')
  }

  // requisito 4.2 — pelo menos uma letra minúscula
  if (!/[a-z]/.test(senha)) {
    erros.push('A senha deve conter pelo menos uma letra minúscula.')
  }

  // requisito 4.2 — pelo menos um número
  if (!/[0-9]/.test(senha)) {
    erros.push('A senha deve conter pelo menos um número.')
  }

  // requisito 4.2 — pelo menos um caractere especial
  // a barra invertida \ antes de alguns caracteres
  // é necessária pois eles têm significado especial
  // em expressões regulares
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
    erros.push('A senha deve conter pelo menos um caractere especial (!@#$%^&* etc).')
  }

  return {
    valida: erros.length === 0,
    erros
  }
}

// ===================================================
// GERAÇÃO DE HASH
// ===================================================

// recebe a senha em texto puro e retorna o hash
// o número 12 é o "custo" do bcrypt
// quanto maior, mais lento e mais seguro
// 12 é o valor recomendado para aplicações modernas
// para referência de tempo no seu computador:
//   custo 10 → ~100ms
//   custo 12 → ~400ms  ← usaremos esse
//   custo 14 → ~1500ms
async function gerarHash(senha) {
  return await bcrypt.hash(senha, 12)
}

// ===================================================
// COMPARAÇÃO DE SENHA COM HASH
// ===================================================

// recebe a senha digitada e o hash salvo no banco
// retorna true se a senha bater com o hash
// retorna false se não bater
// o bcrypt gera o hash da senha digitada e compara
// com o hash salvo — nunca compara texto puro
async function compararSenha(senhaDigitada, hashSalvo) {
  return await bcrypt.compare(senhaDigitada, hashSalvo)
}

// ===================================================
// VERIFICAÇÃO DE HISTÓRICO DE SENHAS
// ===================================================

// requisito 4.4 — não permitir as 3 últimas senhas
// recebe a nova senha e o array de hashes anteriores
// retorna true se a senha JÁ FOI usada antes
async function senhaJaUsada(novaSenha, historicoHashes) {

  // percorre cada hash do histórico
  for (const hash of historicoHashes) {

    // compara a nova senha com cada hash anterior
    const igual = await compararSenha(novaSenha, hash)

    // se bater com qualquer um, já foi usada
    if (igual) return true
  }

  // não bateu com nenhum — senha nunca foi usada
  return false
}

// ===================================================
// EXPORTAÇÃO
// ===================================================

module.exports = {
  validarSenha,
  gerarHash,
  compararSenha,
  senhaJaUsada
}