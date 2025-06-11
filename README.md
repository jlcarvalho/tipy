# Screencast RAG por Fabio Vedovelli

Assistir a aula aqui: [https://youtu.be/PtkzAQD2UzA](https://youtu.be/PtkzAQD2UzA)

IMPORTANTE: este repositório NÃO é um Monorepo.

- **client/**: contém o projeto da aplicação que é acessada pelo browser, usuário final. É uma aplicação React Router 7 (modo framework). Para acessa-la utilize o terminal, acesse a pasta `client/` e execute `npm install` e `npm run dev`, o que tornará a aplicação disponível na porta 5173.

- **server/**: contém o projeto de servidor, responsável por operacionalizar o chatbot e fazer a pesquisa no DB vetorial. Para acessa-la utilize o terminal, acesse a pasta `server/` e execute `npm install` e `npm run dev`, o que tornará a aplicação disponível na porta 4111.

Ambos os projetos possuem o arquivo `.env.example`, que deve ser `salvo como` .env e ter as variáveis de ambiente preenchidas com os valores fornecidos pelos serviços relacionados.

## ⚠️ Atualização Zendesk API

O projeto foi atualizado para usar a **Zendesk Help Center API** em vez do Firecrawl para carregar os artigos da base de conhecimento. 

Para mais detalhes sobre a configuração, consulte: [server/ZENDESK_SETUP.md](server/ZENDESK_SETUP.md)

## 🗃️ Populando os Stores dos Agentes

Antes de utilizar os agentes, é necessário popular os stores vetoriais com os dados da base de conhecimento. Execute os comandos abaixo a partir da pasta `server/`:

### Tipy Agent
```bash
npx tsx src/stores/tipy.ts
```
Este comando irá buscar e processar os artigos da base de conhecimento do Zendesk da Tipspace.

### TFT Academy Agent
```bash
npx tsx src/stores/tft-academy.ts
```
Este comando irá buscar e processar dados do TFT Academy (augments, items, traits, comps, champions).

**Nota:** Certifique-se de que as variáveis de ambiente estão configuradas corretamente no arquivo `.env` antes de executar estes comandos.
