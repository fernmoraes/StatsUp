#!/usr/bin/env node
// Testes de segurança do StatsUp:  npm run security
// (também roda no GitHub a cada push: .github/workflows/security.yml)
//
// 1. Segredos: nenhuma secret key / service_role / senha de banco / chave
//    privada no código — nem no histórico do git.
// 2. Configuração: .env só com variáveis públicas (EXPO_PUBLIC_*) e só HTTPS.
// 3. API real (com a publishable key, como um atacante faria): sem login não dá
//    para ler, criar, alterar nem apagar nada; o esquema não é exposto; HTTP
//    sem TLS não entrega dados.
// O teste entre usuários (A tentando mexer nos dados de B) fica em
// supabase/tests/rls_test.sql, que roda dentro do banco.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const skip = (name, detail) => results.push({ name, ok: null, detail });

// ------------------------------------------------------------------ segredos
const SECRET_PATTERNS = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'secret key do Supabase (sb_secret_…)'],
  [/postgres(?:ql)?:\/\/[^\s:@/]+:(?!\[YOUR-PASSWORD\])[^\s@/]+@/, 'connection string com senha'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'chave privada'],
  [/SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/, 'service role key em variável'],
];
const JWT = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const BINARY = /\.(png|jpe?g|gif|webp|ico|ttf|otf|apk|aab|keystore|jks)$/i;

function scanText(text) {
  const found = [];
  for (const [re, label] of SECRET_PATTERNS) if (re.test(text)) found.push(label);
  for (const token of text.match(JWT) || []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      if (payload.role === 'service_role') found.push('JWT service_role');
    } catch {
      /* não é JWT de verdade */
    }
  }
  return found;
}

const SELF = 'scripts/security-check.mjs'; // contém os padrões acima, não segredos
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter((f) => f && !BINARY.test(f) && f !== SELF);
const leaks = [];
for (const file of tracked) {
  if (!existsSync(file)) continue;
  for (const label of scanText(readFileSync(file, 'utf8'))) leaks.push(`${file}: ${label}`);
}
check('Nenhum segredo nos arquivos do repositório', leaks.length === 0, leaks.join('; '));

try {
  const history = execSync(`git log --all -p --no-color -- . ":(exclude)${SELF}"`, {
    encoding: 'utf8', maxBuffer: 512 * 1024 * 1024,
  });
  const found = [...new Set(scanText(history))];
  check('Nenhum segredo no histórico do git', found.length === 0, found.join('; '));
} catch (e) {
  skip('Nenhum segredo no histórico do git', 'histórico indisponível (clone raso?)');
}

// ------------------------------------------------------------- configuração
const env = {};
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}
const notPublic = Object.keys(env).filter((k) => !k.startsWith('EXPO_PUBLIC_'));
check('.env só tem variáveis públicas (EXPO_PUBLIC_*)', notPublic.length === 0, notPublic.join(', '));
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
check('A chave do app é a publishable key', key.startsWith('sb_publishable_'), key ? key.slice(0, 16) + '…' : 'ausente');
const urls = Object.entries(env).filter(([k]) => k.endsWith('_URL'));
const insecure = urls.filter(([, v]) => !v.startsWith('https://')).map(([k]) => k);
check('Todas as URLs do .env usam HTTPS', insecure.length === 0, insecure.join(', '));

const srcFiles = tracked.filter((f) => /^(app|src|site)\/.*\.(js|jsx|ts|tsx|html|json)$/.test(f));
const httpRefs = [];
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/http:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org)[^\s'"`)]+/g)) httpRefs.push(`${f}: ${m[0]}`);
}
check('Código sem endereços http:// (sem TLS)', httpRefs.length === 0, httpRefs.slice(0, 5).join('; '));

// RPC só para funções fixas e revisadas (sem SQL dinâmico); nada de SQL montado.
const ALLOWED_RPC = ['delete_my_account'];
const badSql = [];
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  if (/\.sql`|raw\s*\(/.test(text)) badSql.push(`${f}: SQL montado`);
  for (const m of text.matchAll(/\.rpc\(\s*([^,)]*)/g)) {
    const name = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (!ALLOWED_RPC.includes(name)) badSql.push(`${f}: rpc(${m[1].trim()})`);
  }
}
check('Sem SQL montado no app (só a API parametrizada e RPCs revisadas)', badSql.length === 0, badSql.join(', '));

// ------------------------------------------------------------- API real (anon)
const url = env.EXPO_PUBLIC_SUPABASE_URL;
// Coluna do dono (filtro obrigatório: o Supabase recusa UPDATE/DELETE sem WHERE)
// e um campo válido para a tentativa de alteração.
const TABLES = [
  { name: 'profiles', owner: 'id', patch: { name: 'invadido' } },
  { name: 'workouts', owner: 'user_id', patch: { note: 'invadido' } },
  { name: 'workout_entries', owner: 'user_id', patch: { percentile: 100 } },
];
const headers = { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const isLeak = async (res) => {
  if (res.status >= 400) return false; // negado: ótimo
  const body = await res.text();
  try {
    const data = JSON.parse(body || '[]');
    return Array.isArray(data) ? data.length > 0 : true;
  } catch {
    return false;
  }
};

let online = false;
try {
  const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
  online = r.ok;
} catch {
  online = false;
}

if (!online || !url) {
  skip('Testes na API real', 'sem conexão com o Supabase');
} else {
  for (const { name: t, owner, patch } of TABLES) {
    const all = `${owner}=not.is.null`; // "todas as linhas de todo mundo"
    const get = await fetch(`${url}/rest/v1/${t}?select=*&limit=5`, { headers });
    check(`Sem login: NÃO lê ${t}`, !(await isLeak(get)), `HTTP ${get.status}`);

    const ins = await fetch(`${url}/rest/v1/${t}`, { method: 'POST', headers, body: JSON.stringify({}) });
    check(`Sem login: NÃO cria em ${t}`, ins.status >= 400, `HTTP ${ins.status}`);

    const upd = await fetch(`${url}/rest/v1/${t}?${all}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
    check(`Sem login: NÃO altera ${t}`, !(await isLeak(upd)), `HTTP ${upd.status}`);

    const del = await fetch(`${url}/rest/v1/${t}?${all}`, { method: 'DELETE', headers });
    check(`Sem login: NÃO apaga ${t}`, !(await isLeak(del)), `HTTP ${del.status}`);
  }

  // Excluir conta: a função não pode ser chamada sem login.
  const rpc = await fetch(`${url}/rest/v1/rpc/delete_my_account`, { method: 'POST', headers, body: '{}' });
  check('Sem login: NÃO chama a função de excluir conta', rpc.status >= 400, `HTTP ${rpc.status}`);

  // Storage: o app não guarda arquivos. Se um dia existir um bucket, ele não
  // pode ser listável/legível sem login (teria que ter políticas próprias).
  const buckets = await fetch(`${url}/storage/v1/bucket`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  let bucketList = [];
  if (buckets.ok) {
    try {
      bucketList = await buckets.json();
    } catch {
      bucketList = [];
    }
  }
  const openBuckets = Array.isArray(bucketList) ? bucketList.map((b) => `${b.name}${b.public ? ' (público)' : ''}`) : [];
  check('Storage: nenhum bucket visível sem login', openBuckets.length === 0, `HTTP ${buckets.status}${openBuckets.length ? ': ' + openBuckets.join(', ') : ''}`);

  const root = await fetch(`${url}/rest/v1/`, { headers: { apikey: key } });
  let paths = [];
  if (root.ok) {
    try {
      paths = Object.keys((await root.json()).paths || {}).filter((p) => p !== '/');
    } catch {
      paths = [];
    }
  }
  check('Esquema do banco não é listado para a chave pública', paths.length === 0, `HTTP ${root.status}${paths.length ? ': ' + paths.join(',') : ''}`);

  try {
    const plain = await fetch(url.replace('https://', 'http://') + '/rest/v1/profiles?select=id', {
      headers: { apikey: key }, redirect: 'manual',
    });
    check('HTTP sem TLS não entrega dados (redireciona/recusa)', plain.status >= 300, `HTTP ${plain.status}`);
  } catch (e) {
    check('HTTP sem TLS não entrega dados (redireciona/recusa)', true, 'conexão recusada');
  }
}

// ---------------------------------------------------------------- relatório
let failed = 0;
for (const r of results) {
  const tag = r.ok === null ? 'PULADO ' : r.ok ? 'PASSOU ' : 'FALHOU ';
  if (r.ok === false) failed++;
  console.log(`${tag} ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
console.log(`\n${results.length - failed} de ${results.length} verificações ok${failed ? ` — ${failed} FALHARAM` : ''}.`);
process.exit(failed ? 1 : 0);
