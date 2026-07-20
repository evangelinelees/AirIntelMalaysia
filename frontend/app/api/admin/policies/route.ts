import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabaseServer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-2",
});

// Helper to generate embedding from text
async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

// GET – fetch policies (admin only), with search + pagination.
// AdminPanel has always sent ?search=&page=&limit= — this handler
// previously ignored all three and returned every row unfiltered with no
// `total`, so the search box and pagination controls in the UI did
// nothing (the list just silently showed everything, every time).
export async function GET(req: NextRequest) {
  const supabase = createSupabaseRouteClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (user?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 5));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("policy_documents")
    .select("id, title, category, source, content", { count: "exact" })
    .order("title", { ascending: true });

  if (search) {
    // Match title OR content so "school closure" finds it in either field.
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ policies: data, total: count ?? 0 });
}

// POST – create a new policy
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, category, source, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 },
      );
    }

    // Generate embedding
    const embedding = await generateEmbedding(content);

    // Insert with top-level columns and metadata (for n8n compatibility)
    const { data, error } = await supabase
      .from("policy_documents")
      .insert({
        title,
        category: category || "general",
        source: source || null,
        content,
        metadata: { title, category, source }, // for n8n vector store
        embedding, // array -> automatically cast to halfvec
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, policy: data });
  } catch (error: any) {
    console.error("POST /api/admin/policies error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT – update an existing policy
export async function PUT(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, title, category, source, content } = await req.json();
    if (!id || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Regenerate embedding
    const embedding = await generateEmbedding(content);

    const { data, error } = await supabase
      .from("policy_documents")
      .update({
        title,
        category: category || "general",
        source: source || null,
        content,
        metadata: { title, category, source },
        embedding,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, policy: data });
  } catch (error: any) {
    console.error("PUT /api/admin/policies error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE – remove a policy
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createSupabaseRouteClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (user?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabase
      .from("policy_documents")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/policies error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
