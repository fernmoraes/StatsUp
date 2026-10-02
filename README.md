# StatsUp

> Aplicativo desenvolvido para a **CP4 de Mobile & IoT** — **FIAP**.

Rastreador de academia que transforma sua força em um **radar de 6 eixos** (Peito,
Costas, Ombro, Bíceps, Tríceps e Perna). Cada eixo mostra o seu **percentil**: quão
forte você é comparado a pessoas do mesmo sexo, peso corporal e idade — força
relativa, não carga bruta.

Implementa os documentos de [`docs/conceito_do_app.md`](docs/conceito_do_app.md)
(produto + motor de cálculo) e [`docs/padroes_de_forca_consolidado.md`](docs/padroes_de_forca_consolidado.md)
(strength standards).

## Download

**[Baixar o StatsUp para Android (APK)](https://github.com/fernmoraes/StatsUp/releases)** —
a versão mais recente fica no topo da página de Releases.

Abra o link no celular Android, baixe o `.apk` e instale. Se o Android pedir,
permita a instalação de apps desta fonte. Versões antigas podem ser desativadas:
nesse caso o app pede para atualizar (veja [`releases/README.md`](releases/README.md)).

No iPhone, use o **Expo Go** (veja "Como rodar").

## Integrantes

| Nome | RM |
|---|---|
| Weslley Cardoso | 557927 |
| Fernando Navajas Moraes | 555080 |
| Gabriel Terra Lilla dos Santos | 554575 |
| José Guilherme Sipaúba Costa | 557274 |
| Bruna da Costa Candeias | 558938 |

## Como rodar

```bash
npm install          # .npmrc já usa legacy-peer-deps
npx expo start       # abra no Expo Go (Android/iOS); use --tunnel se o celular estiver em outra rede
```

O arquivo `.env` já traz a URL e a chave **pública** do Supabase do projeto, então o
app funciona logo após o `npm install`. Se mudar o `.env`, reinicie com
`npx expo start --clear`.

> Requer Node 20.19+ (exigência do React Native 0.86) e Expo SDK 57.

## Gerar o APK (Android)

Versão atual: **2.0.0-beta** (versionCode 3). O build é feito na nuvem da Expo (EAS),
sem precisar de Android Studio:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gera um .apk instalável
```

Ao terminar, o EAS mostra um link/QR code para baixar o APK. Perfis em
[`eas.json`](eas.json): `preview` (APK para testes) e `production` (AAB para a Play
Store). Como publicar uma versão nova e desativar as antigas:
[`releases/README.md`](releases/README.md).

## Funcionalidades

- **Conta** com nome, e-mail e senha forte (Supabase Auth), opção **Salvar conta**,
  **Sair da conta** e **Excluir conta** (apaga a conta e todos os dados).
- **Perguntas iniciais** no primeiro acesso: dados do perfil + suas **marcas** (o máximo
  que aguenta em um exercício de cada grupo). Uma tela explica em 4 passos como
  preencher, com exemplo (e pode ser reaberta em "Como preencher?"). As marcas montam o
  primeiro radar e não contam como treino.
- **Radar de força** com score geral, elo fraco, próxima meta e insights automáticos.
  Toque em qualquer grupo do radar para ver o detalhe: nível do grupo, seus exercícios
  (com o mais fraco destacado) e os que faltam; na Perna, os subgrupos (quadríceps,
  posterior, glúteos e panturrilha).
- **Registro de treino** em lista ou carrossel, com data (dá para marcar um treino
  esquecido de outro dia) e feedback de recorde/subida de nível.
- **Histórico** com calendário, dias desde o último treino de cada grupo, evolução do
  radar e linha do tempo.
- **Tutorial** de uso depois do cadastro (pode ser revisto pelo Perfil).
- **Funciona offline**: tudo é salvo no aparelho primeiro (criptografado) e
  sincronizado com a nuvem quando houver internet.
- **Atualização obrigatória**: versões antigas podem ser desativadas; o app pede para
  baixar a nova.
- **Privacidade (LGPD)**: [política de privacidade](https://fernmoraes.github.io/StatsUp/privacidade.html)
  aceita no cadastro.

## Estrutura

```
app/                          telas (expo-router)
  _layout.js                  fontes, abertura animada, checagem de versão, providers
  index.js                    porta de entrada: login → perguntas iniciais → app
  login.js · register.js      conta (espera progressiva, senha forte, aceite da política)
  delete-account.js           excluir conta (pede a senha de novo)
  onboarding.js               perguntas iniciais + revelação do radar
  (tabs)/                     Radar · Treinar · Histórico · Perfil
  exercise/[id].js            detalhe e padrões de um exercício
  subradar/[group].js         detalhe de cada eixo do radar (perna: subgrupos)
src/
  components/                 UI (ui.js), radar, calendário, diálogos, tutorial, abertura
  data/                       exercícios + standards embarcados, níveis, objetivos
  engine/                     motor de cálculo (calc) e derivações do radar (selectors)
  services/                   nuvem: cliente Supabase, login (auth), sincronização (sync), versão
  state/AppContext.js         conta, perfil, treinos, radar e ações
  storage/                    cache local por conta (store) e criptografia AES-256 (secureStorage)
  utils/                      datas em horário local, validação de entradas
  theme.js                    design system (cores, tipografia, espaçamentos)
assets/                       ícones, logo e GIFs dos exercícios
supabase/
  migrations/                 esquema do banco, segurança, cotas e exclusão de conta
  tests/rls_test.sql          teste de segurança dentro do banco (39 verificações)
  templates/                  e-mail de confirmação em português
scripts/
  security-check.mjs          testes de segurança automáticos (npm run security)
  monitor.sql                 métricas do monitoramento diário
site/                         GitHub Pages: confirmação de e-mail, política de privacidade, version.json
.github/workflows/            site, testes de segurança, backup semanal e monitoramento diário
docs/                         conceito do app e padrões de força
releases/                     APKs locais (fora do git) + como publicar versões
SECURITY.md                   tudo sobre a segurança do app
```

## Backend (Supabase)

Configuração única, feita no painel do projeto no Supabase:

1. **Banco** — *SQL Editor → New query*: rode, nesta ordem:
   1. [`20261001120000_init.sql`](supabase/migrations/20261001120000_init.sql) — tabelas e RLS;
   2. [`20261002120000_security_hardening.sql`](supabase/migrations/20261002120000_security_hardening.sql) — políticas por operação, validações;
   3. [`20261003120000_abuse_protection.sql`](supabase/migrations/20261003120000_abuse_protection.sql) — cotas contra abuso;
   4. [`20261004120000_delete_account.sql`](supabase/migrations/20261004120000_delete_account.sql) — exclusão de conta.

   Depois rode [`supabase/tests/rls_test.sql`](supabase/tests/rls_test.sql): todas as
   linhas devem mostrar ✅ PASSOU.
2. **Senha forte** — *Authentication → Sign In / Providers → Email*: mínimo de 8
   caracteres e exigência de minúsculas, maiúsculas, números e símbolos.
3. **Página de confirmação** — *Authentication → URL Configuration*:
   **Site URL** e **Redirect URLs** = `https://fernmoraes.github.io/StatsUp/`.
4. **E-mail em português** (exige SMTP próprio) — *Authentication → Emails → Confirm
   signup*: assunto `Confirme seu e-mail no StatsUp` e o corpo de
   [`supabase/templates/confirm-signup.html`](supabase/templates/confirm-signup.html).

**Secrets no GitHub** (*Settings → Secrets and variables → Actions*), para o backup e o
monitoramento:

- `SUPABASE_DB_URL` — URI do **Session pooler** (botão *Connect* do Supabase), com a
  senha do banco codificada (`@` → `%40`, `#` → `%23`, `!` → `%21`…);
- `BACKUP_PASSPHRASE` — senha própria dos backups (guarde-a: sem ela o backup não abre).

**Sincronização:** cada mudança é salva no aparelho e enviada para a nuvem; ao abrir
o app ou entrar, o que estiver pendente é enviado e a nuvem é baixada como estado
oficial. Cada conta só enxerga os próprios dados.

## Segurança

Resumo (detalhes, arquivos e como verificar em [`SECURITY.md`](SECURITY.md)):

| Área | O que foi feito |
|---|---|
| **Banco** | RLS em todas as tabelas, uma política por operação (SELECT/INSERT/UPDATE/DELETE) presa ao dono, `anon` sem privilégio, validações (CHECK) de formato e faixa, cotas contra abuso, funções com `search_path` fixo |
| **Login** | Supabase Auth (hash bcrypt, JWT), senha forte (8–30, maiúscula, minúscula, número e símbolo), espera progressiva após 3 erros, JWT conferido no servidor ao abrir o app |
| **Celular** | Sessão, perfil e treinos criptografados (AES-256) com chave no Keystore/Keychain, "só neste aparelho"; backup automático do Android desligado |
| **Chaves e rede** | Só a publishable key no app (o app recusa secret key), só HTTPS, sem SQL montado no app (proteção contra SQL injection) |
| **Entradas** | Validação no app com os mesmos limites do banco; a sincronização descarta dado inválido |
| **Operação** | Backup semanal criptografado (restauração testada), monitoramento diário com alerta por e-mail, atualização obrigatória de versão |
| **Privacidade** | Política de privacidade, consentimento registrado no cadastro, exclusão de conta pelo app (LGPD) |
| **GitHub** | Secret scanning com push protection, Dependabot e testes de segurança a cada push |

**Testes:**

| Teste | Como rodar | Resultado |
|---|---|---|
| Ataques entre usuários, anon, injeção, cotas e exclusão de conta | `supabase/tests/rls_test.sql` no SQL Editor | 39 de 39 |
| Segredos no código e no histórico, configuração, ataques reais à API sem login | `npm run security` (também roda a cada push) | 23 de 23 |

## Automações (GitHub Actions)

| Workflow | Quando | O que faz |
|---|---|---|
| [Publicar site](.github/workflows/pages.yml) | push em `site/` | publica `site/` em `https://fernmoraes.github.io/StatsUp/` |
| [Testes de segurança](.github/workflows/security.yml) | todo push/PR | roda `scripts/security-check.mjs` |
| [Backup do banco](.github/workflows/backup.yml) | toda segunda, 03:00 (Brasília) | dump criptografado (AES-256), guardado por 90 dias |
| [Monitoramento](.github/workflows/monitor.yml) | todo dia, 08:00 (Brasília) | cadastros, volume por conta, espaço e regressões de segurança; falha e manda e-mail se algo passar do limite |

## Site (GitHub Pages)

A pasta [`site/`](site/) é publicada em `https://fernmoraes.github.io/StatsUp/`:

- [`index.html`](site/index.html) — para onde o link do e-mail de confirmação leva
  ("e-mail confirmado", "link expirado" ou apresentação do app);
- [`privacidade.html`](site/privacidade.html) — política de privacidade;
- [`version.json`](site/version.json) — versão mínima e mais recente do app
  (atualização obrigatória).

Para ativar (uma vez): repositório **público** e *Settings → Pages → Source:
GitHub Actions*.

## Design

- Identidade da logo: vermelho `#DE1C1D` + branco sobre carvão quente.
- Tipografia **Barlow Condensed** (títulos e números) + **Barlow** (texto).
- Cores dos grupos musculares validadas para daltonismo entre vizinhos do radar e
  sempre acompanhadas do nome do grupo.
- Diálogos, avisos e abertura animada próprios (nada de alertas do sistema).
- Sistema de design centralizado em [`src/theme.js`](src/theme.js).
- **Imagens dos exercícios**: GIFs da API **WorkoutX**, baixados no build e
  empacotados em `assets/exercises/` (a chave da API não vai no app), com pictograma
  vetorial de reserva.

## O motor (resumo)

```
peso × reps → Epley (1RM est.) → standards do exercício p/ (sexo, peso) com interpolação
            → percentil (interpolação entre níveis) → score do grupo (média ponderada,
              âncora pesa 3×) → eixo do radar
```

Níveis ancoram percentis fixos: Iniciante=P5, Novato=P20, Intermediário=P50,
Avançado=P80, Elite=P95. O **objetivo** do usuário ajusta textos e metas, nunca o
tamanho do eixo.

## Notas de modelagem

- Exercícios com tabela completa por peso corporal (supino, terra, agachamento,
  desenvolvimento, rosca, hip thrust) usam `byBW`; os demais usam multiplicador de PC
  (`ratio`) ou valores absolutos (`flat`, p/ reps). Curvas estimadas a partir de 2
  pontos do documento são marcadas com `source: 'modeled'`.
- Halteres unilaterais comparam **por halter** (`per_dumbbell`); nunca somam os dois lados.
- Percentil e 1RM estimado são **persistidos** no registro (com snapshot do peso), então
  o histórico não é reescrito quando o peso corporal muda.

## Licença

**Todos os direitos reservados.** O código pode ser visualizado, mas não pode ser
copiado, modificado ou reutilizado sem autorização dos autores. Componentes de
terceiros (dependências, fontes, ícones e GIFs dos exercícios) seguem as próprias
licenças. Veja [`LICENSE`](LICENSE).
