import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(254).optional(),
  phone: z.string().max(30).optional(),
  dateOfBirth: z.string().max(10).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer-not']).optional(),
  category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS']).optional(),
  educationLevel: z.enum(['below-10th', '10th-pass', '12th-pass', 'undergraduate', 'graduate', 'postgraduate', 'doctorate']).optional(),
  degree: z.string().max(120).optional(),
  branch: z.string().max(120).optional(),
  institution: z.string().max(200).optional(),
  graduationYear: z.number().int().min(1950).max(2100).optional(),
  cgpa: z.number().min(0).max(100).optional(),
  employmentStatus: z.enum(['student', 'unemployed', 'employed', 'self-employed']).optional(),
  yearsOfExperience: z.number().min(0).max(80).optional(),
  currentRole: z.string().max(120).optional(),
  income: z.number().min(0).max(1_000_000_000).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(120).optional(),
  skills: z.array(z.string().max(80)).max(100).optional(),
  interests: z.array(z.string().max(80)).max(100).optional(),
  preferredLocations: z.array(z.string().max(100)).max(50).optional(),
})

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ profile: null, demo: true })
  }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) return NextResponse.json({ error: 'Could not load profile' }, { status: 500 })
    if (!data) return NextResponse.json({ profile: null })

    return NextResponse.json({
      profile: {
        id: data.id,
        name: data.name,
        email: data.email ?? user.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        gender: data.gender,
        category: data.category,
        educationLevel: data.education_level,
        degree: data.degree,
        branch: data.branch,
        institution: data.institution,
        graduationYear: data.graduation_year,
        cgpa: data.cgpa,
        employmentStatus: data.employment_status,
        yearsOfExperience: data.years_of_experience,
        currentRole: data.current_role,
        income: data.income,
        state: data.state,
        district: data.district,
        skills: data.skills ?? [],
        interests: data.interests ?? [],
        preferredLocations: data.preferred_locations ?? [],
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ success: true, demo: true })
  }
  try {
    const body: unknown = await request.json()
    const parsed = profileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid profile data', details: parsed.error.flatten() }, { status: 400 })
    }
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    const value = parsed.data
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      name: value.name,
      phone: value.phone,
      date_of_birth: value.dateOfBirth,
      gender: value.gender,
      category: value.category,
      education_level: value.educationLevel,
      degree: value.degree,
      branch: value.branch,
      institution: value.institution,
      graduation_year: value.graduationYear,
      cgpa: value.cgpa,
      employment_status: value.employmentStatus,
      years_of_experience: value.yearsOfExperience,
      current_role: value.currentRole,
      income: value.income,
      state: value.state,
      district: value.district,
      skills: value.skills,
      interests: value.interests,
      preferred_locations: value.preferredLocations,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) return NextResponse.json({ error: 'Could not save profile' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/** Delete only the authenticated user's account; profile-owned rows cascade via FK. */
export async function DELETE() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Account deletion is not configured' }, { status: 503 })
  }
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
    if (deleteError) return NextResponse.json({ error: 'Could not delete account' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 })
  }
}
