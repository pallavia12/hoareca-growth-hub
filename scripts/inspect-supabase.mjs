/**
 * Inspect Supabase tables with AUTHENTICATED session (RLS requires this).
 * Uses demo credentials: admin@ninjacart.com / demo123456
 * Run: node scripts/inspect-supabase.mjs
 */
const SUPABASE_URL = 'https://hsxpemaarxbcihkkgexi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzeHBlbWFhcnhiY2loa2tnZXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDIwNTYsImV4cCI6MjA4NjM3ODA1Nn0.aiNqWz7D-8oCHBq3L4wgS86LV8qwX5oEmUJpDGbbfZc';

const DEMO_EMAIL = 'admin@ninjacart.com';
const DEMO_PASSWORD = 'demo123456';

const TABLES = [
  'user_roles', 'profiles', 'pincode_persona_map', 'prospects', 'leads',
  'sample_orders', 'avocado_specs', 'agreements', 'activity_logs',
  'sku_mapping', 'stage_mapping', 'delivery_slots', 'distribution_partners',
  'drop_reasons', 'notifications', 'appointments',
];

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  });
  const data = await res.json();
  if (data.access_token) return data.access_token;
  throw new Error(data.msg || data.error_description || 'Sign in failed');
}

async function queryTable(table, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : []; } catch { data = []; }
  return { data, status: res.status, ok: res.ok };
}

async function getCount(table, token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'count=exact',
    },
  });
  const range = res.headers.get('content-range');
  return range ? range.split('/')[1] : '0';
}

async function main() {
  console.log('=== Supabase Table & Data Inspection (Authenticated) ===\n');

  let token;
  try {
    token = await signIn();
    console.log('Signed in as:', DEMO_EMAIL);
  } catch (e) {
    console.error('Auth failed:', e.message);
    console.log('\nTrying without auth (anon only)...');
    token = SUPABASE_ANON_KEY;
  }

  console.log('');
  const results = [];

  for (const table of TABLES) {
    const { data, status, ok } = await queryTable(table, token);
    const count = data?.length ?? 0;
    const total = ok ? await getCount(table, token) : '?';

    if (!ok) {
      console.log(`❌ ${table}: HTTP ${status}`);
      results.push({ table, total: '?', sample: null, error: true });
      continue;
    }

    const totalNum = typeof total === 'string' ? parseInt(total, 10) : total;
    console.log(`✅ ${table}: ${total} row(s)`);

    let sample = null;
    if (data && data.length > 0) {
      const cols = Object.keys(data[0]);
      console.log('   Columns:', cols.join(', '));
      sample = data.slice(0, 3).map(row => {
        const trimmed = {};
        for (const k of cols.slice(0, 5)) trimmed[k] = row[k];
        return trimmed;
      });
    }
    results.push({ table, total: totalNum, sample, error: false });
  }

  console.log('\n--- Summary ---');
  const withData = results.filter(r => !r.error && r.total > 0);
  const empty = results.filter(r => !r.error && r.total === 0);
  console.log('Tables with data:', withData.length, '-', withData.map(r => `${r.table}(${r.total})`).join(', '));
  console.log('Empty tables:', empty.length, '-', empty.map(r => r.table).join(', '));

  if (withData.length > 0) {
    console.log('\n--- Sample Rows (first 3, first 5 columns) ---');
    for (const { table, sample } of withData) {
      if (sample && sample.length) {
        console.log(`\n${table}:`);
        console.log(JSON.stringify(sample, null, 2));
      }
    }
  }
}

main().catch(console.error);
