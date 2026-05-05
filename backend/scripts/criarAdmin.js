// script executado uma única vez para criar o admin inicial
// após criar, pode deletar esse arquivo se quiser

require('dotenv').config({ path: './.env' })
const db = require('../database')
const { validarSenha, gerarHash } = require('../utils/senha')

async function criarAdmin() {
  const username = 'admin'
  const email = 'admin@app.com'
  const password = 'Admin@12345!'
  const role = 'admin'

  // valida a senha pela política
  const validacao = validarSenha(password)
  if (!validacao.valida) {
    console.error('Senha inválida:', validacao.erros)
    process.exit(1)
  }

  try {
    // verifica se já existe um admin
    const [existente] = await db.query(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    )

    if (existente.length > 0) {
      console.log('Usuário admin já existe.')
      process.exit(0)
    }

    // gera o hash corretamente
    const hash = await gerarHash(password)

    // insere o admin
    const [resultado] = await db.query(
      'INSERT INTO usuarios (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hash, role]
    )

    // salva no histórico de senhas
    await db.query(
      'INSERT INTO historico_senhas (usuario_id, password_hash) VALUES (?, ?)',
      [resultado.insertId, hash]
    )

    console.log('Admin criado com sucesso!')
    console.log('Username:', username)
    console.log('Senha:   ', password)
    console.log('⚠️  Troque a senha após o primeiro login!')

    process.exit(0)

  } catch (erro) {
    console.error('Erro ao criar admin:', erro.message)
    process.exit(1)
  }
}

criarAdmin()