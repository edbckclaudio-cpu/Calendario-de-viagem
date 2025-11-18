import { NextResponse } from "next/server";

// Simple geocoding via OpenStreetMap Nominatim. No API key required.
// Input: query param `q` (address string). Optional `city` for bias.
// Output: { lat, lon, displayName } of the first result or 404.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ error: "Missing or too short query" }, { status: 400 });
  }
  const fullQuery = q.trim();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(fullQuery)}`;
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "trae-viagem-demo/1.0",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      cache: "no-store",
    });
    if (!resp.ok) {
      return NextResponse.json({ error: "Geocoding request failed" }, { status: 502 });
    }
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No results" }, { status: 404 });
    }
    const first = data[0];
    return NextResponse.json({
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: first.display_name,
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}