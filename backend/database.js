// ===================================================
// IMPORTAÇÕES
// ===================================================

// mysql2/promise — é a versão do mysql2 que suporta
// async/await. Sem o /promise você seria obrigado a
// usar callbacks (código mais difícil de ler)
const mysql = require('mysql2/promise')

// ===================================================
// CRIAÇÃO DO POOL DE CONEXÕES
// ===================================================

// pool é um conjunto de conexões reutilizáveis
// ao invés de abrir e fechar uma conexão a cada
// requisição (lento), o pool mantém conexões abertas
// e as reutiliza conforme necessário
const pool = mysql.createPool({

  // lê as configurações do arquivo .env
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // número máximo de conexões simultâneas no pool
  // para uma aplicação pequena, 10 é mais que suficiente
  connectionLimit: 10,

  // converte automaticamente os tipos do MySQL
  // para tipos do JavaScript
  // ex: DATETIME vira objeto Date do JS
  //     TINYINT(1) vira boolean true/false
  typeCast: true
})

// ===================================================
// TESTE DE CONEXÃO
// ===================================================

// função que testa se conseguimos conectar ao banco
// chamada uma vez quando o servidor inicia
async function testarConexao() {
  try {

    // getConnection() pega uma conexão do pool
    // se o banco estiver fora do ar, vai lançar um erro
    const conexao = await pool.getConnection()

    console.log('Banco de dados conectado com sucesso!')

    // release() devolve a conexão para o pool
    // importante sempre fazer isso após usar
    conexao.release()

  } catch (erro) {
    console.error('Erro ao conectar no banco de dados:', erro.message)
    console.error('Verifique se o Docker está rodando e as configurações do .env')

    // encerra o processo do Node com código de erro
    // não faz sentido o servidor rodar sem banco
    process.exit(1)
  }
}

// chama o teste imediatamente quando o arquivo é carregado
testarConexao()

// ===================================================
// EXPORTAÇÃO
// ===================================================

// exporta o pool para ser usado em outros arquivos
// quando outro arquivo fizer:
// const db = require('./database')
// ele receberá esse pool e poderá fazer consultas
module.exports = pool