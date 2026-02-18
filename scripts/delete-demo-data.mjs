/**
 * Delete prospects, leads, sample_orders, and agreements from Supabase.
 * Uses admin login (demo credentials). Requires RLS DELETE policies for admins.
 *
 * Run: node scripts/delete-demo-data.mjs
 */
const SUPABASE_URL = 'https://hsxpemaarxbcihkkgexi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeHBlbWFhcnhiY2loa2tnZXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDIwNTYsImV4cCI6MjA4NjM3ODA1Nn0.aiNqWz7D-8oCHBq3L4wgS86LV8qwX5oEmUJpDGbbfZc';
const DEMO_EMAIL = 'admin@ninjacart.com';
const DEMO_PASSWORD = 'demo123456';

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(data.msg || data.error_description || 'Sign in failed');
}

async function deleteAll(table, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
  });
  return { ok: res.ok, status: res.status };
}

async function main() {
  console.log('Signing in as admin...');
  const token = await signIn();
  console.log('Deleting demo data (agreements → sample_orders → leads → prospects)...\n');

  const order = ['agreements', 'sample_orders', 'leads', 'prospects'];
  for (const table of order) {
    const { ok, status } = await deleteAll(table, token);
    console.log(ok ? `✅ Deleted all ${table}` : `❌ ${table}: HTTP ${status}`);
  }
  console.log('\nDone.');
}

main().catch(console.error);
