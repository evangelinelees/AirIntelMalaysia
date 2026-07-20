import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📦 Body received:", body);

    // Build the payload to send to n8n
    const payload = {
      lat: body.lat,
      lon: body.lon,
      requireLLM: body.requireLLM || false, // ✅ Pass this through
      userId: body.userId || null,
    };
    console.log("📤 Sending to n8n:", payload);

    const n8nUrl = `${process.env.N8N_HOST}/webhook/v1/haze-vector-math`;
    console.log("📤 Calling n8n:", n8nUrl);

    const n8nRes = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AirIntel-Secret": process.env.AIRINTEL_SHARED_SECRET!,
      },
      body: JSON.stringify(payload),
    });

    console.log("📥 n8n status:", n8nRes.status);

    const responseText = await n8nRes.text();
    console.log("📥 n8n response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return NextResponse.json(data, { status: n8nRes.status });
  } catch (error) {
    console.error("❌ Error in /api/haze:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
