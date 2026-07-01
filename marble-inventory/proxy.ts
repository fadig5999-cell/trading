import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isSupabaseConfigured } from "@/lib/env";

export async function proxy(request: NextRequest) {
  // DEMO_MODE renders the UI with local sample data and skips auth entirely.
  // It is meant ONLY for local design previews without a Supabase project.
  // Never set DEMO_MODE=1 on a real deployment.
  if (process.env.DEMO_MODE === "1") {
    return NextResponse.next();
  }
  if (!isSupabaseConfigured()) {
    if (request.nextUrl.pathname === "/setup") {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
