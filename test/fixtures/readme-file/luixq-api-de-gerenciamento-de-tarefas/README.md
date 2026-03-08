# API de Gerenciamento de Tarefas

## 1. Usuários - FINALIZADO
- Cadastro
  - Endpoint: `POST /users`
  - Campos: Nome, E-mail, Senha
- Login
  - Endpoint: `POST /auth/login`
  - Retorno: Token JWT
- Perfil
  - Endpoint: `GET /users/@me`
  - Requer autenticação

## 2. Tarefas - FINALIZADO
- Criar tarefa
  - Endpoint: `POST /tasks`
  - Campos: Título, Descrição, Status (pendente/concluída)
  - Requer autenticação
- Listar tarefas
  - Endpoint: `GET /tasks`
  - Parâmetros: Filtro por status, Paginação
  - Requer autenticação
- Atualizar tarefa
  - Endpoint: `PUT /tasks/:id`
  - Requer autenticação
- Deletar tarefa
  - Endpoint: `DELETE /tasks/:id`
  - Requer autenticação

## 3. Banco de Dados - FINALIZADO
- Tabelas:
  - `users`
    - Campos: id, name, email, password_hash, created_at
  - `tasks`
    - Campos: id, title, description, status, user_id, created_at

## 4. Tecnologias
- Backend: Fastify
- Banco de Dados: PostgreSQL (com Prisma)
- Autenticação: JWT

## 5. Extensões
- Documentação com Swagger

## Instruções de instalação

Mude o .env.example para .env e configure

```bash
docker compose up --detach
yarn
yarn dev
```
