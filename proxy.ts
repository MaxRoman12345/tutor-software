import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/middleware";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  tutor: "/tutor",
  student: "/student",
};

/** Sections that require a session. /protected is the shadcn auth block's demo page. */
const PROTECTED_PREFIXES = ["/admin", "/tutor", "/student", "/protected"];

export async function proxy(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthEntry = path === "/auth/login" || path === "/auth/sign-up";
  const isRoot = path === "/";

  if (!user) {
    if (isProtected || isRoot) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return response;
  }

  // Only hit the DB when the answer actually changes what we do - public pages
  // still get their session cookie refreshed by updateSession above.
  if (!isProtected && !isAuthEntry && !isRoot) return response;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.sub)
    .single();

  const role = profile?.role as string | undefined;
  const home = role ? ROLE_HOME[role] : undefined;

  // Land signed-in users on their dashboard instead of the empty landing page.
  if (isRoot) {
    return NextResponse.redirect(new URL(home ?? "/auth/login", request.url));
  }

  // Signed in but no recognised role - let the request through rather than
  // bounce them between two redirects forever.
  if (!home) return response;

  // Land people on their own dashboard instead of the auth block's demo page.
  if (path === "/protected" || path.startsWith("/protected/")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Already signed in, no reason to see login/sign-up again.
  if (isAuthEntry) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Wrong section for this role → send them to their own.
  for (const [r, prefix] of Object.entries(ROLE_HOME)) {
    if (path.startsWith(prefix) && role !== r) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
