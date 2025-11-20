# Consulta CNPJ - Receita Federal

## 🎯 Funcionalidade

Sistema de consulta de CNPJ integrado com o portal da Receita Federal do Brasil, com resolução automática de CAPTCHA usando 2Captcha.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: Next.js 14+, React, Shadcn/ui, Tailwind CSS
- **Backend**: Next.js API Routes
- **Web Scraping**: Playwright
- **Resolução CAPTCHA**: 2Captcha API

## 📋 Configuração

### 1. Chave API 2Captcha

1. Crie uma conta em [https://2captcha.com](https://2captcha.com)
2. Obtenha sua chave API
3. Adicione ao arquivo `.env.local`:

```
TWOCAPTCHA_API_KEY=sua_chave_aqui
```

### 2. Instalação de Dependências

```bash
npm install playwright 2captcha-ts
npx playwright install
```

## 🚀 Uso

### Acesso
- Navegue para: `http://localhost:3000/consulta-cnpj`
- Ou acesse pelo menu lateral: **Ferramentas > Consulta CNPJ**

### Funcionalidades
- ✅ Formatação automática de CNPJ (XX.XXX.XXX/XXXX-XX)
- ✅ Validação de formato
- ✅ Consulta em tempo real na Receita Federal
- ✅ Exibição completa dos dados cadastrais
- ✅ Indicação visual da situação cadastral (Ativo/Inativo)
- ✅ Tratamento de erros amigável

## 📊 Dados Retornados

- **Razão Social**
- **Nome Fantasia**
- **Situação Cadastral** (Ativa, Suspensa, Baixada, etc.)
- **Data de Abertura**
- **Tipo** (Matriz, Filial)
- **Capital Social**
- **Natureza Jurídica**
- **Atividade Principal**
- **Endereço Completo**

## ⚠️ Limitações e Considerações

1. **CAPTCHA**: O sistema usa 2Captcha para resolver CAPTCHAs automaticamente. Cada resolução custa aproximadamente $0.003.

2. **Tempo de Resposta**: A consulta pode levar 10-30 segundos devido ao processo de scraping e resolução de CAPTCHA.

3. **Taxa de Sucesso**: A taxa de sucesso depende da qualidade da resolução do CAPTCHA (geralmente >90%).

4. **Conformidade Legal**: Este sistema é apenas para consultas legítimas de CNPJ. Não armazenamos dados pessoais.

## 🔧 Manutenção

### Atualizações do Site da Receita Federal

O site da Receita Federal pode mudar sua estrutura. Se a consulta parar de funcionar:

1. Verifique os seletores CSS no arquivo `app/api/consulta-cnpj/route.ts`
2. Atualize os seletores conforme a nova estrutura HTML
3. Teste com diferentes CNPJs

### Logs e Debugging

Os logs do servidor mostram:
- Início da consulta
- Status da resolução do CAPTCHA
- Erros de scraping
- Tempo total de processamento

## 🚨 Tratamento de Erros

O sistema lida com:
- ❌ CNPJ inválido (formato incorreto)
- ❌ CNPJ não encontrado
- ❌ Erro na resolução do CAPTCHA
- ❌ Timeout do scraping
- ❌ Mudanças na estrutura do site

## 📞 Suporte

Para problemas técnicos:
1. Verifique os logs do console do servidor
2. Teste a conexão com 2Captcha
3. Verifique se o Playwright está funcionando corretamente
4. Confirme que a URL da Receita Federal está acessível