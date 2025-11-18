import { NextResponse } from "next/server";
import { getFlightInfoByCode } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || "";
    const date = url.searchParams.get("date") || "";
    if (!code || !date) {
      return NextResponse.json({ error: "Missing code or date" }, { status: 400 });
    }

    const apiUrl = process.env.FLIGHT_API_URL;
    const apiKey = process.env.FLIGHT_API_KEY;

    // If real API configured, attempt fetch; otherwise use local simulation.
    if (apiUrl && apiKey) {
      try {
        const q = new URLSearchParams({ code, date }).toString();
        const res = await fetch(`${apiUrl}?${q}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`Upstream error ${res.status}`);
        const data = await res.json();
        // Expect a normalized shape; if different, map below.
        const departureHour = data?.departureHour ?? data?.hour ?? "12";
        const departureMinute = data?.departureMinute ?? data?.minute ?? "00";
        const h = parseInt(departureHour, 10);
        const faixa = h >= 6 && h < 12 ? "Manhã: 06-12h" : h >= 12 && h < 18 ? "Tarde: 12-18h" : "Noite: 18-06h";
        return NextResponse.json({
          departureHour: String(departureHour).padStart(2, "0"),
          departureMinute: String(departureMinute).padStart(2, "0"),
          horarioFaixa: faixa,
          dateYMD: date.slice(0, 10),
          airline: data?.airline ?? null,
          origin: data?.origin ?? null,
          destination: data?.destination ?? null,
        });
      } catch (err) {
        // Fall back to local simulation if upstream fails
        const info = getFlightInfoByCode(code, date);
        if (!info) return NextResponse.json({ error: "No info" }, { status: 404 });
        return NextResponse.json(info);
      }
    }

    // No API configured: use local simulation
    const info = getFlightInfoByCode(code, date);
    if (!info) return NextResponse.json({ error: "No info" }, { status: 404 });
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}