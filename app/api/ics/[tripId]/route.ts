import { NextResponse } from "next/server";
import { getIcsForTrip } from "@/lib/ics-store";

export async function GET(req: Request, { params }: { params: { tripId: string } }) {
  try {
    const tripId = params.tripId;
    const url = new URL(req.url);
    const payloadB64 = url.searchParams.get("payload") || "";

    let icsText = "";
    if (payloadB64) {
      try {
        icsText = Buffer.from(payloadB64, "base64").toString("utf-8");
      } catch {
        icsText = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//TRAE//PT-BR//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          "DTSTART:20240101T090000",
          "DTEND:20240101T100000",
          `SUMMARY:Calendário TRAE (${tripId})`,
          "DESCRIPTION:Assinatura webcal sem payload válido",
          `UID:trae-fallback-${tripId}`,
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
      }
    } else {
      // Sem payload: tenta usar ICS armazenado no servidor; senão, fallback mínimo.
      const stored = await getIcsForTrip(tripId);
      if (stored) {
        icsText = stored;
      } else {
        icsText = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//TRAE//PT-BR//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          "DTSTART:20240101T090000",
          "DTEND:20240101T100000",
          `SUMMARY:Calendário TRAE (${tripId})`,
          "DESCRIPTION:Assinatura webcal ativa",
          `UID:trae-default-${tripId}`,
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
      }
    }

    return new NextResponse(icsText, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename=trae-calendario-${tripId}.ics`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}