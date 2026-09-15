import { type NextRequest } from "next/server";
import { rafraichirSession } from "@/lib/supabase/rafraichir-session";

export default async function proxy(request: NextRequest) {
  return rafraichirSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
