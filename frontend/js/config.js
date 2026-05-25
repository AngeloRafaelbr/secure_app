// ===================================================
// CONFIG.JS
// Configuração do ambiente da aplicação
//
// Ao alternar entre desenvolvimento e produção
// mude APENAS este arquivo
//
// DESENVOLVIMENTO LOCAL:
//   frontend servido pelo Express em localhost:3000
//   API_URL = '' (relativo — mesma origem)
//
// PRODUÇÃO — Docker com Nginx:
//   frontend servido pelo Nginx
//   Nginx redireciona /api/* para o backend
//   API_URL = '/api'
// ===================================================

// DESENVOLVIMENTO LOCAL
//const API_URL = ''

// PRODUÇÃO — Docker com Nginx
 const API_URL = '/api'