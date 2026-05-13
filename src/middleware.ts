import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // Determine if this is a CRM request (crm.finfo.com.au or /crm path in dev)
  const isCRM = host.startsWith('crm.') || pathname.startsWith('/crm');

  if (!isCRM) {
    // Website traffic — serve normally, no auth needed
    return NextResponse.next();
  }

  // --- CRM: set up Supabase session refresh ---
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(toSet: { name: string; value: string; options?: object }[]) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // On crm.finfo.com.au, rewrite /login → /crm/login, etc.
  if (host.startsWith('crm.')) {
    const rewriteUrl = request.nextUrl.clone();
    if (!pathname.startsWith('/crm')) {
      rewriteUrl.pathname = '/crm' + (pathname === '/' ? '/dashboard' : pathname);
      response = NextResponse.rewrite(rewriteUrl);
    }
  }

  // Protect CRM routes — redirect unauthenticated users to login
  const isLoginPage = pathname.startsWith('/crm/login');
  if (!user && !isLoginPage && pathname.startsWith('/crm')) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/crm/login';
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-logged-in users away from login page
  if (user && isLoginPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/crm/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
