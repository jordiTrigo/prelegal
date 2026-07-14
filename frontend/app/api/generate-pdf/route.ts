import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ndaFormSchema } from "@/lib/nda-schema";
import { NdaPdfDocument } from "@/components/NdaPdfDocument";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const result = ndaFormSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const buffer = await renderToBuffer(NdaPdfDocument({ data: result.data }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="mutual-nda.pdf"',
    },
  });
}
