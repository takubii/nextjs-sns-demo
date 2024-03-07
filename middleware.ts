import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // セッション(cookie)を利用したAuthの管理が可能となる
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}
