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

## Segunda lista

| Item | Situação | Onde |
|---|---|---|
| **Supabase Auth** | Login/cadastro usam o Supabase Auth (nada de autenticação caseira): hash bcrypt, tokens JWT assinados, limite de tentativas. | `src/services/auth.js` |
| **Políticas do Storage** | O app **não guarda arquivos**, então não existe bucket. O teste automático falha se algum dia um bucket ficar visível sem login. | `scripts/security-check.mjs` |
| **Validação de entradas** | Um módulo com **os mesmos limites do banco** valida cada campo na tela (data real, altura 50–260 cm, peso 20–400 kg, carga 0,5–1000 kg, reps 1–1000, nome ≤ 60) e a sincronização descarta o que o banco recusaria, para nada travar. No banco, as regras CHECK barram o que vier direto pela API. Não há Edge Functions. | `src/utils/validation.js`, `src/services/sync.js`, migração de segurança |
| **Validação de JWT no backend** | Não há backend próprio: o Supabase valida o JWT em toda requisição e o RLS usa o `auth.uid()` desse token validado. No app, ao abrir, a sessão salva é conferida no servidor (`getUser`): conta apagada ou sessão revogada sai da conta. | `src/services/auth.js` (`restoreSession`) |
| **Backups e recuperação** | Backup semanal automático no GitHub (papéis, esquema, contas e dados), **criptografado com AES-256** e guardado por 90 dias. Restauração abaixo. | `.github/workflows/backup.yml` |
| **Publishable key no frontend** | Só a publishable key vai no app; o app recusa secret key e o teste confere a chave do `.env`. | `src/services/supabase.js`, `scripts/security-check.mjs` |

## Terceira lista

| Item | Situação | Onde |
|---|---|---|
| **Proteção contra abuso** | **Cotas no banco**: até 100 treinos novos por conta a cada 24 h, 5000 no total e 60 exercícios por treino (reenvios da sincronização não contam; o horário de inserção é do banco, não do app). **Espera progressiva no login**: depois de 3 senhas erradas, 15 s, 30 s, 1 min… até 5 min. O Supabase ainda limita tentativas por IP no servidor. | `supabase/migrations/20261003120000_abuse_protection.sql`, `src/services/auth.js` |
| **Armazenamento seguro de tokens** | Token cifrado com AES-256, chave no Keystore/Keychain marcada como **"só neste aparelho, só desbloqueado"** (não vai para backup do iCloud). **Backup automático do Android desligado** (`allowBackup: false`). | `src/storage/secureStorage.js`, `app.json` |
| **Logs e monitoramento** | Action **diária** que mede cadastros, volume por conta, espaço do banco e regressões de segurança (tabela sem RLS, política aberta, `anon` com privilégio). Passou do limite → a action falha e o GitHub manda e-mail. Só números agregados (os logs são públicos). Para investigar: Supabase → *Logs* (Auth e API). | `.github/workflows/monitor.yml`, `scripts/monitor.sql` |
| **Supabase Vault** | **Não se aplica**: o banco não guarda chaves de serviços de terceiros. A chave da API dos GIFs só foi usada no build e não está no app nem no banco. Se um dia for preciso guardar uma, ela vai para o Vault. | — |

**CAPTCHA (decisão):** o Supabase aceita hCaptcha/Turnstile no cadastro, mas no app
isso exige uma tela web embutida e piora o cadastro. Fica para quando o
monitoramento mostrar sinal de robôs (alerta de muitos cadastros por hora).

## Privacidade (LGPD)

| Item | Como é atendido | Onde |
|---|---|---|
| **Política de privacidade** | Página pública explicando dados, finalidade, base legal, onde ficam (São Paulo), compartilhamento, retenção e direitos. | `site/privacidade.html` → https://fernmoraes.github.io/StatsUp/privacidade.html |
| **Consentimento** | Aceite obrigatório no cadastro; versão e data do aceite ficam na conta (`privacy_version`, `privacy_accepted_at`). | `app/register.js`, `src/services/auth.js` |
| **Excluir conta (art. 18)** | Perfil → Excluir conta. Pede a senha de novo e chama `delete_my_account()`, que só apaga a conta de quem chamou (sem parâmetro) e leva junto perfil, treinos e exercícios; o app limpa a cópia do aparelho. Backups criptografados expiram em até 90 dias. | `supabase/migrations/20261004120000_delete_account.sql`, `app/delete-account.js` |

## Backups

O plano grátis do Supabase não oferece backup para baixar, então o backup é feito
pela action **Backup do banco** (toda segunda-feira, ou manualmente em *Actions →
Backup do banco → Run workflow*).

**Ativar (uma vez)** — no GitHub: *Settings → Secrets and variables → Actions →
New repository secret*:

- `SUPABASE_DB_URL`: no Supabase, botão **Connect** → **Session pooler** → copie a
  URI e troque `[YOUR-PASSWORD]` pela senha do banco. (A "Direct connection" não
  funciona no GitHub: é só IPv6.)
- `BACKUP_PASSPHRASE`: uma senha longa, só para os backups. **Guarde-a**: sem ela
  o backup não abre.

**Restaurar** — baixe o artifact da execução em *Actions*, e então:

```bash
# 1. Descriptografar e descompactar (pede a BACKUP_PASSPHRASE)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -in statsup-backup-AAAA-MM-DD.tar.gz.enc | tar -xzf -

# 2. Restaurar no projeto de destino
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "<connection string do projeto de destino>"
```

O cache criptografado em cada celular também funciona como cópia local: se a nuvem
perder dados recentes, o que estava pendente no aparelho é reenviado.

**Extra — dados criptografados no celular:** a sessão de login (tokens), o perfil e
os treinos ficam cifrados com **AES-256** no aparelho. A chave fica no cofre do
sistema (Android Keystore / iOS Keychain) e é trocada a cada gravação. Quem copiar
os arquivos do app não consegue ler nada. (`src/storage/secureStorage.js`)

## Configuração no painel do Supabase (uma vez)

1. **SQL Editor** → rode `supabase/migrations/20261002120000_security_hardening.sql`
   depois `supabase/migrations/20261003120000_abuse_protection.sql` e
   `supabase/migrations/20261004120000_delete_account.sql`.
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
