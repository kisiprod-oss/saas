import { NextResponse } from "next/server";
import { creerClientServeur } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
