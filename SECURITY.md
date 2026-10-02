# Segurança do StatsUp

Como cada item de segurança é atendido, onde está no código e como verificar.

| # | Item | Como é atendido | Onde |
|---|---|---|---|
| 1 | **SQL injection** | O app nunca monta SQL: tudo passa pela API do Supabase (PostgREST), que envia valores como parâmetros. Não há funções RPC nem SQL dinâmico. O banco ainda valida formato e faixa de cada campo (ex.: `id` só `[A-Za-z0-9_-]`, percentil 0–100). | `src/services/sync.js`, `supabase/migrations/20261002120000_security_hardening.sql` |
| 2 | **Senha forte** | Cadastro exige 8 a 30 caracteres, com minúscula, maiúscula, número e caractere especial, com checklist ao vivo. O Supabase guarda só o hash (bcrypt). Login aceita senhas antigas para não trancar contas. | `src/services/auth.js` (`PASSWORD_RULES`), `app/register.js` |
| 3 | **RLS em todas as tabelas** | `profiles`, `workouts` e `workout_entries` com RLS ligado. O teste confere que **toda** tabela do schema `public` tem RLS. | migrações + `supabase/tests/rls_test.sql` |
| 4 | **Políticas por operação** | Uma política para cada SELECT, INSERT, UPDATE e DELETE, todas presas ao dono (`auth.uid()`); UPDATE também impede "trocar de dono". Nenhuma usa `using (true)`. O papel `anon` (sem login) não tem privilégio algum. | `20261002120000_security_hardening.sql` |
| 5 | **Secret key só no backend** | O app usa apenas a publishable key. Ele **se recusa a iniciar** se receber uma `sb_secret_…` ou JWT `service_role`. O `.env` só aceita `EXPO_PUBLIC_*`. O teste automático procura segredos no código **e em todo o histórico do git**. | `src/services/supabase.js`, `scripts/security-check.mjs` |
| 6 | **HTTPS/TLS** | O app recusa URL do Supabase sem `https://`. A API do Supabase e o GitHub Pages só servem HTTPS (HTTP redireciona). Não existe backend próprio. O build Android de release bloqueia tráfego sem TLS por padrão. | `src/services/supabase.js` |
| 7 | **Testes de segurança** | (a) `rls_test.sql`: dois usuários reais tentando ler/alterar/apagar/se passar um pelo outro, anon, e injeção. (b) `npm run security`: segredos, configuração e ataques reais à API sem login — roda no GitHub a cada push. | `supabase/tests/rls_test.sql`, `scripts/security-check.mjs`, `.github/workflows/security.yml` |

**Extra — dados criptografados no celular:** a sessão de login (tokens), o perfil e
os treinos ficam cifrados com **AES-256** no aparelho. A chave fica no cofre do
sistema (Android Keystore / iOS Keychain) e é trocada a cada gravação. Quem copiar
os arquivos do app não consegue ler nada. (`src/storage/secureStorage.js`)

## Configuração no painel do Supabase (uma vez)

1. **SQL Editor** → rode `supabase/migrations/20261002120000_security_hardening.sql`.
2. **SQL Editor** → rode `supabase/tests/rls_test.sql`. Todas as linhas devem
   mostrar ✅ PASSOU.
3. **Authentication → Sign In / Providers → Email** (ou *Authentication →
   Policies*, conforme o painel): *Minimum password length* = **8** e *Password
   requirements* = **lowercase, uppercase letters, digits and symbols**. Assim a
   regra também vale para quem chamar a API direto, sem o app.
4. **Advisors → Security Advisor**: não deve haver avisos de RLS.

## Verificar

```bash
npm run security
```

## Se uma chave vazar

A publishable key é pública por natureza (o RLS protege os dados). Se uma
**secret key** vazar: *Settings → API Keys* → revogue/gere outra imediatamente.
