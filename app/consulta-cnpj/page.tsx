"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CNPJData {
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

export default function ConsultaCNPJPage() {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<CNPJData | null>(null);

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
    if (match) {
      return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
    }
    return cleaned;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
    setError("");
  };

  const validateCNPJ = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, "");
    return cleaned.length === 14;
  };

  const handleConsulta = async () => {
    if (!validateCNPJ(cnpj)) {
      setError("Por favor, insira um CNPJ válido com 14 dígitos.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch("/api/consulta-cnpj", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cnpj: cnpj.replace(/\D/g, "") }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao consultar CNPJ");
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao consultar CNPJ. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Consulta de CNPJ - Receita Federal
          </h1>
          <p className="text-gray-600">
            Consulte a situação cadastral de qualquer CNPJ no portal da Receita Federal
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Digite o CNPJ da empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCnpjChange}
                maxLength={18}
                className="flex-1"
                disabled={loading}
              />
              <Button
                onClick={handleConsulta}
                disabled={loading || !cnpj}
                size="lg"
              >
                {loading ? "Consultando..." : "Consultar"}
              </Button>
            </div>
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Consultando na Receita Federal...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado da Consulta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Dados da Empresa</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Razão Social:</span>
                        <p className="text-gray-900">{data.razaoSocial}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Nome Fantasia:</span>
                        <p className="text-gray-900">{data.nomeFantasia || "Não informado"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">CNPJ:</span>
                        <p className="text-gray-900">{data.cnpj}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Tipo:</span>
                        <p className="text-gray-900">{data.tipo}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Situação Cadastral</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Situação:</span>
                        <p className={`font-semibold ${
                          data.situacaoCadastral.toLowerCase().includes('ativo') 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {data.situacaoCadastral}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Data de Abertura:</span>
                        <p className="text-gray-900">{data.dataAbertura}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Capital Social:</span>
                        <p className="text-gray-900">{data.capitalSocial}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Natureza Jurídica:</span>
                        <p className="text-gray-900">{data.naturezaJuridica}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Endereço</h3>
                  <div className="text-sm text-gray-900">
                    <p>{data.endereco.logradouro}, {data.endereco.numero}</p>
                    {data.endereco.complemento && <p>{data.endereco.complemento}</p>}
                    <p>{data.endereco.bairro}</p>
                    <p>{data.endereco.municipio} - {data.endereco.uf}</p>
                    <p>CEP: {data.endereco.cep}</p>
                  </div>
                </div>

                {data.atividadePrincipal && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Atividade Principal</h3>
                    <p className="text-sm text-gray-900">{data.atividadePrincipal}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}