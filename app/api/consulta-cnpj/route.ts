import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { Captcha } from "2captcha-ts";

const solver = new Captcha(process.env.TWOCAPTCHA_API_KEY || "");

interface CNPJRequest {
  cnpj: string;
}

interface CNPJResponse {
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  dataAbertura: string;
  cnpj: string;
  tipo: string;
  capitalSocial: string;
  naturezaJuridica: string;
  atividadePrincipal: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json() as CNPJRequest;

    if (!cnpj || cnpj.length !== 14) {
      return NextResponse.json(
        { error: "CNPJ inválido. Deve conter 14 dígitos." },
        { status: 400 }
      );
    }

    if (!process.env.TWOCAPTCHA_API_KEY) {
      return NextResponse.json(
        { error: "Chave API do 2Captcha não configurada." },
        { status: 500 }
      );
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Navegar para o site da Receita Federal
      await page.goto('https://servicos.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp', {
        waitUntil: 'networkidle'
      });

      // Aguardar o carregamento do formulário
      await page.waitForSelector('input[name="cnpj"]', { timeout: 10000 });

      // Capturar a imagem do CAPTCHA
      const captchaElement = await page.$('img[src*="captcha"]');
      if (!captchaElement) {
        throw new Error("Elemento CAPTCHA não encontrado");
      }

      // Obter o src da imagem do CAPTCHA
      const captchaSrc = await captchaElement.getAttribute('src');
      if (!captchaSrc) {
        throw new Error("SRC do CAPTCHA não encontrado");
      }

      // Converter a imagem para base64
      const captchaImageResponse = await page.request.get(captchaSrc);
      const captchaBuffer = await captchaImageResponse.body();
      const captchaBase64 = captchaBuffer.toString('base64');

      // Resolver o CAPTCHA usando 2Captcha
      console.log('Resolvendo CAPTCHA...');
      const captchaResult = await solver.imageCaptcha(captchaBase64);
      
      if (!captchaResult.data) {
        throw new Error("Falha ao resolver CAPTCHA");
      }

      const captchaCode = captchaResult.data;
      console.log('CAPTCHA resolvido:', captchaCode);

      // Preencher o formulário
      await page.fill('input[name="cnpj"]', cnpj);
      await page.fill('input[name="captcha"]', captchaCode);

      // Submeter o formulário
      await page.click('input[type="submit"]');

      // Aguardar o resultado
      await page.waitForLoadState('networkidle');

      // Verificar se há erro
      const errorElement = await page.$('.error, .mensagem_erro');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        throw new Error(errorText || "Erro ao consultar CNPJ");
      }

      // Extrair os dados da página de resultados
      const data = await extractCNPJData(page);

      return NextResponse.json({ data });

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('Erro na consulta CNPJ:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Erro ao processar consulta CNPJ" 
      },
      { status: 500 }
    );
  }
}

async function extractCNPJData(page: any): Promise<CNPJResponse> {
  // Aguardar a página de resultados carregar
  await page.waitForSelector('table, .resultado, .dados', { timeout: 10000 });

  // Extrair dados da tabela ou elementos de resultado
  const data = await page.evaluate(() => {
    const extractText = (selector: string, defaultValue: string = "Não informado") => {
      const element = document.querySelector(selector);
      return element ? element.textContent?.trim() || defaultValue : defaultValue;
    };

    // Tentar diferentes seletores com base na estrutura da página
    const razaoSocial = extractText('td:has(td:contains("Razão Social")) + td', extractText('td:contains("Razão Social") + td'));
    const nomeFantasia = extractText('td:has(td:contains("Nome Fantasia")) + td', extractText('td:contains("Nome Fantasia") + td'));
    const situacaoCadastral = extractText('td:has(td:contains("Situação Cadastral")) + td', extractText('td:contains("Situação Cadastral") + td'));
    const dataAbertura = extractText('td:has(td:contains("Data de Abertura")) + td', extractText('td:contains("Data de Abertura") + td'));
    const cnpj = extractText('td:has(td:contains("CNPJ")) + td', extractText('td:contains("CNPJ") + td'));
    const tipo = extractText('td:has(td:contains("Tipo")) + td', extractText('td:contains("Tipo") + td'));
    const capitalSocial = extractText('td:has(td:contains("Capital Social")) + td', extractText('td:contains("Capital Social") + td'));
    const naturezaJuridica = extractText('td:has(td:contains("Natureza Jurídica")) + td', extractText('td:contains("Natureza Jurídica") + td'));
    const atividadePrincipal = extractText('td:has(td:contains("Atividade Principal")) + td', extractText('td:contains("Atividade Principal") + td'));

    // Extrair endereço
    const logradouro = extractText('td:has(td:contains("Logradouro")) + td', extractText('td:contains("Logradouro") + td'));
    const numero = extractText('td:has(td:contains("Número")) + td', extractText('td:contains("Número") + td'));
    const complemento = extractText('td:has(td:contains("Complemento")) + td', extractText('td:contains("Complemento") + td'));
    const bairro = extractText('td:has(td:contains("Bairro")) + td', extractText('td:contains("Bairro") + td'));
    const municipio = extractText('td:has(td:contains("Município")) + td', extractText('td:contains("Município") + td'));
    const uf = extractText('td:has(td:contains("UF")) + td', extractText('td:contains("UF") + td'));
    const cep = extractText('td:has(td:contains("CEP")) + td', extractText('td:contains("CEP") + td'));

    return {
      razaoSocial,
      nomeFantasia,
      situacaoCadastral,
      dataAbertura,
      cnpj,
      tipo,
      capitalSocial,
      naturezaJuridica,
      atividadePrincipal,
      endereco: {
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
        cep
      }
    };
  });

  // Se não conseguir extrair dados, tentar uma abordagem mais genérica
  if (!data.razaoSocial || data.razaoSocial === "Não informado") {
    const genericData = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      let extractedData: any = {};

      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent?.trim().toLowerCase() || '';
            const value = cells[1].textContent?.trim() || '';

            if (label.includes('razão social') || label.includes('razao social')) {
              extractedData.razaoSocial = value;
            } else if (label.includes('nome fantasia')) {
              extractedData.nomeFantasia = value;
            } else if (label.includes('situação cadastral') || label.includes('situacao cadastral')) {
              extractedData.situacaoCadastral = value;
            } else if (label.includes('data de abertura')) {
              extractedData.dataAbertura = value;
            } else if (label.includes('cnpj')) {
              extractedData.cnpj = value;
            } else if (label.includes('tipo')) {
              extractedData.tipo = value;
            } else if (label.includes('capital social')) {
              extractedData.capitalSocial = value;
            } else if (label.includes('natureza jurídica') || label.includes('natureza juridica')) {
              extractedData.naturezaJuridica = value;
            } else if (label.includes('atividade principal')) {
              extractedData.atividadePrincipal = value;
            }
          }
        });
      });

      return extractedData;
    });

    // Mesclar dados genéricos com os anteriores
    return {
      razaoSocial: genericData.razaoSocial || data.razaoSocial,
      nomeFantasia: genericData.nomeFantasia || data.nomeFantasia,
      situacaoCadastral: genericData.situacaoCadastral || data.situacaoCadastral,
      dataAbertura: genericData.dataAbertura || data.dataAbertura,
      cnpj: genericData.cnpj || data.cnpj,
      tipo: genericData.tipo || data.tipo,
      capitalSocial: genericData.capitalSocial || data.capitalSocial,
      naturezaJuridica: genericData.naturezaJuridica || data.naturezaJuridica,
      atividadePrincipal: genericData.atividadePrincipal || data.atividadePrincipal,
      endereco: data.endereco
    };
  }

  return data;
}