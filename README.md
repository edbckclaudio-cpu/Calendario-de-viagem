# Calendário de Viagem

Projeto Next.js com sidebar colapsável, breadcrumbs automáticos e fundo translúcido temático de viagem. Estruturado com Tailwind CSS e App Router.

## Visão Geral
- Sidebar funcional com ícones, tooltips e estados desabilitados conforme `tripId`.
- Breadcrumbs gerados a partir da rota atual.
- Fundo translúcido com imagem de praia aplicado na área de conteúdo (`.app-content`), preservando legibilidade.
- Páginas de exemplo: calendário, busca de voo, múltiplas cidades, revisão de passageiros, privacidade/termos e outras.

## Requisitos
- Node.js 18+ (recomendado 18 LTS ou 20).
- NPM (ou PNPM/Yarn, se preferir).

## Primeiros Passos
1. Instale dependências:
   ```bash
   npm install
   ```
2. Desenvolvimento:
   ```bash
   npm run dev
   # app em http://localhost:3000/
   ```
3. Build de produção:
   ```bash
   npm run build
   npm start
   ```

## Scripts (package.json)
- `dev`: inicia servidor de desenvolvimento.
- `build`: gera build de produção.
- `start`: executa o servidor a partir do build.

## Estrutura
- `app/`: páginas e estilos globais (`globals.css`), usando App Router.
- `components/ui/`: componentes reutilizáveis (sidebar, breadcrumbs, inputs, dialogs).
- `lib/`: utilitários e integrações (ex.: `firebase.ts`).
- `tailwind.config.ts` e `postcss.config.js`: configuração de Tailwind.

## Estilos de Fundo
- O fundo é aplicado via pseudo-elemento em `.app-content::before` com baixa opacidade e `pointer-events: none` para não interferir na UI.
- A imagem padrão está configurada em `app/globals.css` (atual Pexels). Você pode substituir por uma URL própria ou usar um ativo local.

## Variáveis de Ambiente
- Se integrar serviços externos (ex.: Firebase), crie um `.env.local` com as chaves necessárias e importe no código conforme a prática de Next.js.
- O projeto inclui `.gitignore` para evitar o commit de `.env*`, `.next/`, `node_modules/` e arquivos gerados.

## Convenções de Branch/PR
- Fluxo sugerido: criar branches `feature/...` e abrir PRs para `main`.
- Este repositório foi preparado com um commit inicial limpo (sem `node_modules/.next`).

## Ajustes e Melhorias Futuras
- Persistir estado de colapso da sidebar (localStorage).
- Ajustar ícones/labels conforme o branding.
- Trocar imagem de fundo por SVG/gradiente ou hospedar localmente para maior controle.
- Adicionar animações leves (ex.: transições na sidebar).

## Licença
Projeto educacional/demonstrativo. Adapte a licença conforme necessidade.