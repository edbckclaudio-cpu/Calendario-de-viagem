import { NextResponse } from "next/server";

// Endpoint para servir um arquivo .ics.
// Se receber "payload" (base64 de texto ICS), retorna exatamente esse conteúdo.
// Caso contrário, retorna um ICS vazio com PRODID e cabeçalhos corretos.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const payloadB64 = url.searchParams.get("payload") || "";
    let icsText = "";

    if (payloadB64) {
      try {
        // Decodifica base64 seguro para URL
        const decoded = Buffer.from(payloadB64, "base64").toString("utf-8");
        icsText = decoded;
      } catch {
        // Fallback: ICS mínimo
        icsText = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//TRAE//PT-BR//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          "DTSTART:20240101T090000",
          "DTEND:20240101T100000",
          "SUMMARY:Calendário TRAE",
          "DESCRIPTION:Assinatura webcal sem payload válido",
          "UID:trae-fallback",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
      }
    } else {
      // ICS mínimo quando não há payload
      icsText = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TRAE//PT-BR//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        "DTSTART:20240101T090000",
        "DTEND:20240101T100000",
        "SUMMARY:Calendário TRAE",
        "DESCRIPTION:Assinatura webcal ativa",
        "UID:trae-default",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n");
    }

    return new NextResponse(icsText, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=trae-calendario.ics",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}