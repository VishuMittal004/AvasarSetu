import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const nullableText = (max: number) => z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional(),
)

const optionalDate = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string()
    .length(10)
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(value => {
      const date = new Date(`${value}T00:00:00.000Z`)
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    }, 'Enter a valid date of birth.')
    .nullable()
    .optional(),
)

const profileSchema = z.object({
  name: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? null : value, z.string().trim().min(1).max(100).nullable().optional()),
  email: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? null : value, z.string().email().max(254).nullable().optional()),
  phone: nullableText(30),
  dateOfBirth: optionalDate,
  gender: z.enum(['male', 'female', 'other', 'prefer-not']).optional(),
  category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS']).optional(),
  educationLevel: z.enum(['below-10th', '10th-pass', '12th-pass', 'undergraduate', 'graduate', 'postgraduate', 'doctorate']).optional(),
  degree: nullableText(120),
  branch: nullableText(120),
  institution: nullableText(200),
  graduationYear: z.number().int().min(1950).max(2100).nullable().optional(),
  cgpa: z.number().min(0).max(100).nullable().optional(),
  employmentStatus: z.enum(['student', 'unemployed', 'employed', 'self-employed']).optional(),
  yearsOfExperience: z.number().min(0).max(80).nullable().optional(),
  currentRole: nullableText(120),
  income: z.number().min(0).max(1_000_000_000).nullable().optional(),
  state: nullableText(100),
  district: nullableText(120),
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
    if (error) {
      console.error('[api/profile] Profile upsert rejected:', error.code ?? 'unknown database error')
      return NextResponse.json({ error: 'Could not save profile. Check the profile data and try again.', code: error.code }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/profile] Unexpected save error:', error instanceof Error ? error.name : 'unknown error')
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
