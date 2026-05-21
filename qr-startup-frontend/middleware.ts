import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Ask Supabase who is currently visiting the site
  const { data: { user } } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // ==========================================
  // ENTERPRISE BOUNCER RULES
  // ==========================================

  if (isAdminRoute) {
    // RULE 1: If they are NOT logged in at all
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // RULE 2: If they ARE logged in, check if they are in the database Admin table
    const { data: adminRecord, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    // If there is no record of them in the admin table...
    if (error || !adminRecord) {
      console.log(`Security Block: User ${user.email} attempted admin access. Kicked to homepage.`)
      
      // Kick them away to the public homepage
      const url = request.nextUrl.clone()
      url.pathname = '/' 
      return NextResponse.redirect(url)
    }
    
    // If they pass, they are officially an admin. Let them through!
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}