'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type Client = Awaited<ReturnType<typeof createClient>>

export async function login(formData: FormData) {
  let supabase: Client
  try {
    supabase = await createClient()
  } catch (error) {
    console.error('Supabase client creation failed:', error)
    redirect('/login?error=Configuration error. Please contact support.')
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function signup(formData: FormData) {
  let supabase: Client
  try {
    supabase = await createClient()
  } catch (error) {
    console.error('Supabase client creation failed:', error)
    redirect('/signup?error=Configuration error. Please contact support.')
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/app')
}

export async function signout() {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
  revalidatePath('/', 'layout')
  redirect('/login')
}
