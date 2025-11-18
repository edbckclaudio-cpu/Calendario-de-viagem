import { NextResponse } from "next/server";
import { getIcsForTrip, setIcsForTrip } from "@/lib/ics-store";

export async function GET(
  _req: Request,
  { params }: { params: { tripId: string } }
) {
  const { tripId } = params;
  const ics = await getIcsForTrip(tripId);
  if (!ics) {
    return NextResponse.json({ error: "ICS not found" }, { status: 404 });
  }
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `inline; filename="viagem-${tripId}.ics"`,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  const { tripId } = params;
  const text = await req.text();
  if (!text || !text.includes("BEGIN:VCALENDAR")) {
    return NextResponse.json({ error: "Invalid ICS payload" }, { status: 400 });
  }
  await setIcsForTrip(tripId, text);
  return NextResponse.json({ ok: true });
}