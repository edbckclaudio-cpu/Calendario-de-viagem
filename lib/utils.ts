import { type ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simulated flight info lookup by code and date.
// In dev, we derive deterministic times from the numeric part of the code.
// Replace with a real API call when available.
export function getFlightInfoByCode(code: string, dateISO: string): null | {
  departureHour: string;
  departureMinute: string;
  horarioFaixa: string;
  dateYMD: string;
} {
  if (!code || !dateISO) return null;
  const normalized = code.toUpperCase().trim();
  const digits = normalized.replace(/[^0-9]/g, "");
  const base = digits ? parseInt(digits, 10) : normalized.length * 7;
  const hour = String(base % 24).padStart(2, "0");
  const minuteRaw = (base * 7) % 60;
  const minute5 = String(Math.floor(minuteRaw / 5) * 5).padStart(2, "0");
  const h = parseInt(hour, 10);
  const faixa = h >= 6 && h < 12
    ? "Manhã: 06-12h"
    : h >= 12 && h < 18
    ? "Tarde: 12-18h"
    : "Noite: 18-06h";
  return {
    departureHour: hour,
    departureMinute: minute5,
    horarioFaixa: faixa,
    dateYMD: dateISO.slice(0, 10),
  };
}

// Map de IATA -> IANA timezone. Mantém principais aeroportos citados.
const IATA_TIMEZONES: Record<string, string> = {
  // Itália
  FCO: "Europe/Rome",
  CIA: "Europe/Rome",
  // Brasil (sudeste/sul):
  GRU: "America/Sao_Paulo",
  CGH: "America/Sao_Paulo",
  VCP: "America/Sao_Paulo",
  GIG: "America/Sao_Paulo",
  SDU: "America/Sao_Paulo",
  BSB: "America/Sao_Paulo",
  CNF: "America/Sao_Paulo",
  CWB: "America/Sao_Paulo",
  POA: "America/Sao_Paulo",
  FLN: "America/Sao_Paulo",
  IGU: "America/Sao_Paulo",
  VIX: "America/Sao_Paulo",
  GYN: "America/Sao_Paulo",
  // Brasil (nordeste):
  FOR: "America/Fortaleza",
  NAT: "America/Fortaleza",
  THE: "America/Fortaleza",
  SLZ: "America/Fortaleza",
  REC: "America/Recife",
  MCZ: "America/Maceio",
  SSA: "America/Bahia",
  // Brasil (norte/centro-oeste):
  MAO: "America/Manaus",
  PVH: "America/Porto_Velho",
  BEL: "America/Belem",
  MCP: "America/Belem",
  PMW: "America/Araguaina",
  CGB: "America/Cuiaba",
  RBR: "America/Rio_Branco",
};

export function getTimeZoneForAirport(iata?: string): string | null {
  if (!iata) return null;
  const code = iata.toUpperCase();
  return IATA_TIMEZONES[code] || null;
}

export function getGMTOffsetLabel(dateISO: string, timeZone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = fmt.formatToParts(new Date(`${dateISO.slice(0, 10)}T12:00:00Z`));
    const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
    // tzPart typically like "GMT+1"
    return tzPart;
  } catch {
    return "GMT";
  }
}

export function formatLocalTimeWithGMT(dateISO: string, hour: string, minute: string, iata?: string): string {
  const tz = getTimeZoneForAirport(iata || "");
  const gmt = tz ? getGMTOffsetLabel(dateISO, tz) : "GMT";
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${hh}:${mm} (${gmt})`;
}

// Converte horário local de um fuso (fromIATA) para outro (toIATA)
// e retorna formatado com rótulo GMT do destino.
function parseGMTOffsetMinutes(label: string): number {
  // Aceita formatos "GMT+1", "GMT-03", "GMT+05:30"
  const m = label.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10) || 0;
  const mins = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (hours * 60 + mins);
}

function getOffsetMinutes(dateISO: string, timeZone: string): number {
  const label = getGMTOffsetLabel(dateISO, timeZone);
  return parseGMTOffsetMinutes(label);
}

export function formatConvertedLocalTimeWithGMT(
  dateISO: string,
  hour: string | number,
  minute: string | number,
  fromIATA?: string,
  toIATA?: string
): string {
  const tzFrom = getTimeZoneForAirport(fromIATA || "");
  const tzTo = getTimeZoneForAirport(toIATA || "");
  if (!tzTo) {
    // Sem destino conhecido, apenas rotula com GMT genérico
    return formatLocalTimeWithGMT(dateISO, String(hour), String(minute), toIATA);
  }
  const baseMin = (parseInt(String(hour), 10) || 0) * 60 + (parseInt(String(minute), 10) || 0);
  const offFrom = tzFrom ? getOffsetMinutes(dateISO, tzFrom) : 0;
  const offTo = getOffsetMinutes(dateISO, tzTo);
  const converted = baseMin + (offTo - offFrom);
  const norm = ((converted % 1440) + 1440) % 1440; // normaliza em 0..1439
  const hh = String(Math.floor(norm / 60)).padStart(2, "0");
  const mm = String(norm % 60).padStart(2, "0");
  const gmt = getGMTOffsetLabel(dateISO, tzTo);
  return `${hh}:${mm} (${gmt})`;
}

// ===== Transporte / Distância Aproximada =====
// Coordenadas simplificadas de aeroportos (IATA) e alguns centros de cidade.
const IATA_COORDS: Record<string, { lat: number; lon: number }> = {
  FCO: { lat: 41.8003, lon: 12.2389 }, // Roma Fiumicino
  CIA: { lat: 41.799, lon: 12.5949 },  // Roma Ciampino
  GRU: { lat:  -23.4356, lon: -46.4731 },
  GIG: { lat:  -22.809, lon: -43.2506 },
  SDU: { lat:  -22.9105, lon: -43.1631 },
  CGH: { lat:  -23.6261, lon: -46.6566 },
  VCP: { lat:  -23.0074, lon: -47.1345 },
  CDG: { lat:  49.0097, lon: 2.5479 },
  ORY: { lat:  48.7231, lon: 2.379 },
  LHR: { lat:  51.4700, lon: -0.4543 },
  JFK: { lat:  40.6413, lon: -73.7781 },
};

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  roma: { lat: 41.9028, lon: 12.4964 },
  rome: { lat: 41.9028, lon: 12.4964 },
  "rio de janeiro": { lat: -22.9068, lon: -43.1729 },
  "sao paulo": { lat: -23.5505, lon: -46.6333 },
  paris: { lat: 48.8566, lon: 2.3522 },
  london: { lat: 51.5074, lon: -0.1278 },
  "new york": { lat: 40.7128, lon: -74.006 },
};

export function airportCoordsByIATA(iata?: string): { lat: number; lon: number } | null {
  if (!iata) return null;
  const code = iata.toUpperCase();
  return IATA_COORDS[code] || null;
}

export function cityCenterCoordsByName(name?: string): { lat: number; lon: number } | null {
  if (!name) return null;
  const key = name.toLowerCase();
  return CITY_COORDS[key] || null;
}

export function haversineDistanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Tenta extrair coordenadas do texto do endereço ("lat,lon").
export function parseCoordsFromAddress(address?: string): { lat: number; lon: number } | null {
  if (!address) return null;
  const m = address.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
}

export function estimateTransportOptions(distanceKm: number, cityName?: string): Array<{
  modo: string;
  precoEstimado: string;
  tempoEstimadoMin: number;
  observacao?: string;
}> {
  const city = (cityName || "").toLowerCase();
  const isEurope = ["roma", "rome", "paris", "london"].includes(city);
  const currency = isEurope ? "€" : "R$";
  const round = (x: number) => Math.round(x);

  // Suposições simples de custo por km e velocidades médias.
  const taxiBase = isEurope ? 5 : 6;
  const taxiPerKm = isEurope ? 1.2 : 2.5;
  const ridePerKm = isEurope ? 1.0 : 2.0;
  const shuttlePerKm = isEurope ? 0.4 : 1.2;
  const transitTicket = isEurope ? 2.0 : 6.0; // bilhete/integração

  const taxiMinutes = round((distanceKm / 40) * 60 + 10);
  const rideMinutes = round((distanceKm / 38) * 60 + 8);
  const shuttleMinutes = round((distanceKm / 30) * 60 + 15);
  const transitMinutes = round((distanceKm / 25) * 60 + 20);

  return [
    {
      modo: "Táxi",
      precoEstimado: `${currency}${round(taxiBase + taxiPerKm * distanceKm)}`,
      tempoEstimadoMin: taxiMinutes,
      observacao: "Preço variável por tarifa, tráfego e horário.",
    },
    {
      modo: "App (ride-share)",
      precoEstimado: `${currency}${round(ridePerKm * distanceKm)}`,
      tempoEstimadoMin: rideMinutes,
    },
    {
      modo: "Translado/Shuttle",
      precoEstimado: `${currency}${round(shuttlePerKm * distanceKm)}`,
      tempoEstimadoMin: shuttleMinutes,
    },
    {
      modo: "Transporte público",
      precoEstimado: `${currency}${round(transitTicket)}`,
      tempoEstimadoMin: transitMinutes,
      observacao: "Necessita conexão; tempo inclui caminhada/espera.",
    },
  ];
}