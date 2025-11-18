import { NextResponse } from "next/server";

function priceLevelLabel(level?: number): string | undefined {
  if (level === undefined || level === null) return undefined;
  const map = ["$", "$$", "$$$", "$$$$"];
  return map[Math.max(0, Math.min(3, level))];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = (searchParams.get("city") || "").trim();
  const type = (searchParams.get("type") || "atividade").trim();
  const qParam = (searchParams.get("q") || "").trim();
  if (!city) return NextResponse.json({ error: "Missing city" }, { status: 400 });

  // Integração via RapidAPI (TripAdvisor) para restaurantes
  if (type === "restaurante") {
    const rapidKey = process.env.RAPIDAPI_KEY;
    const RAPID_HOST = "travel-advisor.p.rapidapi.com"; // API by apidojo
    if (rapidKey) {
      try {
        // 1) Buscar location_id pela cidade
        const locUrl = `https://${RAPID_HOST}/locations/search?query=${encodeURIComponent(city)}&limit=5&lang=pt_BR&units=km`;
        const locResp = await fetch(locUrl, {
          headers: {
            "X-RapidAPI-Key": rapidKey,
            "X-RapidAPI-Host": RAPID_HOST,
          },
          cache: "no-store",
        });
        if (locResp.ok) {
          const locJson = await locResp.json();
          // Suporta formatos diferentes: data[] ou results[]
          const entries: any[] = Array.isArray((locJson as any).data)
            ? (locJson as any).data
            : Array.isArray((locJson as any).results)
              ? (locJson as any).results
              : [];
          const cityEntry = entries.find((e) => {
            const name = e?.result_object?.name?.toLowerCase?.();
            const category = e?.result_object?.category?.name || e?.category?.name;
            return name && name.includes(city.toLowerCase()) && /city/i.test(String(category || ""));
          }) || entries[0];
          const locationId = cityEntry?.result_object?.location_id || cityEntry?.result_object?.geo_id || cityEntry?.location_id;
          if (locationId) {
            // 2) Listar restaurantes por location_id, opcionalmente filtrando por palavra-chave
            const params = new URLSearchParams({
              location_id: String(locationId),
              limit: "12",
              currency: "BRL",
              lang: "pt_BR",
            });
            if (qParam) params.set("keyword", qParam);
            const restUrl = `https://${RAPID_HOST}/restaurants/list?${params.toString()}`;
            const restResp = await fetch(restUrl, {
              headers: {
                "X-RapidAPI-Key": rapidKey,
                "X-RapidAPI-Host": RAPID_HOST,
              },
              cache: "no-store",
            });
            if (restResp.ok) {
              const restJson = await restResp.json();
              const itemsRaw: any[] = Array.isArray((restJson as any).data)
                ? (restJson as any).data
                : Array.isArray((restJson as any).results)
                  ? (restJson as any).results
                  : [];
              const items = itemsRaw
                .filter((r) => r?.name)
                .slice(0, 12)
                .map((r) => {
                  const price = r?.price || r?.price_level;
                  const cuisines = Array.isArray(r?.cuisine) ? r.cuisine.map((c: any) => c?.name).filter(Boolean).join(", ") : undefined;
                  const details: string[] = [];
                  if (price) details.push(`Faixa de preço: ${price}`);
                  if (r?.rating) details.push(`Avaliação: ${r.rating}`);
                  if (cuisines) details.push(`Cozinhas: ${cuisines}`);
                  const url = r?.web_url || r?.website;
                  return { nome: r.name, detalhes: details.join(" — "), url };
                });
              if (items.length) {
                return NextResponse.json({ items });
              }
            }
          }
        }
      } catch (err) {
        // Continua para fallback Google abaixo
      }
    }
    // Se sem RAPIDAPI_KEY ou falhou acima, segue com Google como fallback abaixo
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_PLACES_API_KEY not configured" }, { status: 501 });
  }

  const queries = qParam
    ? [qParam]
    : type === "restaurante"
      ? [
          "restaurant",
          "bistro",
          "trattoria",
          "pizzeria",
          "seafood",
          "steakhouse",
          "bakery",
          "cafe",
          "wine bar",
          "gelato",
        ]
      : [
          // EN basics
          "tour",
          "museum",
          "attraction",
          "walking tour",
          "landmark",
          "gallery",
          "cathedral",
          "park",
          "monument",
          // EN extended
          "things to do",
          "city tour",
          "day trip",
          "boat tour",
          "hop-on hop-off",
          "viewpoint",
          "observation deck",
          "market",
          "food tour",
          "wine tasting",
          "theatre",
          "concert",
          "live music",
          "nightlife",
          "zoo",
          "aquarium",
          "castle",
          "palace",
          "ruins",
          "historic neighborhood",
          "street art",
          "bike tour",
          // PT-BR equivalentes
          "passeio",
          "museu",
          "atração",
          "city tour",
          "ponto turístico",
          "galeria de arte",
          "catedral",
          "parque",
          "monumento",
          "mirante",
          "observatório",
          "mercado",
          "feira",
          "tour gastronômico",
          "degustação de vinhos",
          "teatro",
          "concerto",
          "música ao vivo",
          "vida noturna",
          "zoológico",
          "aquário",
          "castelo",
          "palácio",
          "ruínas",
          "bairro histórico",
          "arte de rua",
          "tour de bicicleta",
        ];

  try {
    const results: any[] = [];
    const seen = new Set<string>();

    for (const q of queries) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${q} in ${city}`)}&language=pt-BR&key=${apiKey}`;
      const resp = await fetch(url, { cache: "no-store" });
      if (!resp.ok) continue;
      const data = await resp.json();
      for (const item of data.results || []) {
        const id = item.place_id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        results.push(item);
      }
      if (results.length >= 48) break;
    }

    const top = results.slice(0, 20);
    const detailed = await Promise.all(top.map(async (r) => {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(r.place_id)}&fields=name,price_level,opening_hours,website,url,business_status,rating,user_ratings_total&language=pt-BR&key=${apiKey}`;
      try {
        const dResp = await fetch(detailsUrl, { cache: "no-store" });
        if (!dResp.ok) throw new Error("details failed");
        const dJson = await dResp.json();
        const d = dJson.result || {};
        const price = priceLevelLabel(d.price_level);
        const schedule = Array.isArray(d.opening_hours?.weekday_text) ? d.opening_hours.weekday_text[0] : undefined;
        const name = d.name || r.name;
        const url = d.url || (r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : undefined);
        const details: string[] = [];
        if (price) details.push(`Faixa de preço: ${price}`);
        if (schedule) details.push(`Horários: ${schedule}`);
        if (d.rating) details.push(`Avaliação: ${d.rating}${d.user_ratings_total ? ` (${d.user_ratings_total})` : ""}`);
        if (d.business_status && d.business_status !== "OPERATIONAL") details.push(`Status: ${d.business_status}`);
        return { nome: name, detalhes: details.join(" — "), url };
      } catch {
        const name = r.name;
        const url = r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : undefined;
        return { nome: name, detalhes: "", url };
      }
    }));

    return NextResponse.json({ items: detailed });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}