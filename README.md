# StatsUp

> Aplicativo desenvolvido para a **CP4 de Mobile & IoT** — **FIAP**.

Rastreador de academia que transforma sua força em um **radar de 6 eixos** (Peito,
Costas, Ombro, Bíceps, Tríceps e Perna). Cada eixo mostra o seu **percentil**: quão
forte você é comparado a pessoas do mesmo sexo, peso corporal e idade — força
relativa, não carga bruta.

Implementa os documentos de [`docs/conceito_do_app.md`](docs/conceito_do_app.md)
(produto + motor de cálculo) e [`docs/padroes_de_forca_consolidado.md`](docs/padroes_de_forca_consolidado.md)
(strength standards).

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
npx expo start       # abra no Expo Go (Android/iOS)
```

O arquivo `.env` já traz a URL e a chave **pública** do Supabase do projeto, então o
app funciona logo após o `npm install`. Se mudar o `.env`, reinicie com
`npx expo start --clear`.

> Requer Node 20.19+ (exigência do React Native 0.86) e Expo SDK 57.

## Gerar o APK (Android)

Versão atual: **1.0.0-beta**. O build é feito na nuvem da Expo (EAS), sem precisar de
Android Studio:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # gera um .apk instalável
```

Ao terminar, o EAS mostra um link/QR code para baixar e instalar o APK no celular.
Perfis em [`eas.json`](eas.json): `preview` (APK para testes) e `production`
(AAB para a Play Store).

## Funcionalidades

- **Conta** com nome, e-mail e senha (Supabase Auth), opção **Salvar conta** e **Sair da conta**.
- **Perguntas iniciais** no primeiro acesso: dados do perfil + suas **marcas** (o máximo
  que aguenta em um exercício de cada grupo). As marcas montam o primeiro radar e não
  contam como treino.
- **Radar de força** com score geral, elo fraco, próxima meta e insights automáticos;
  toque em Perna para ver quadríceps, posterior, glúteos e panturrilha.
- **Registro de treino** em lista ou carrossel, com data (dá para marcar um treino
  esquecido de outro dia) e feedback de recorde/subida de nível.
- **Histórico** com calendário, dias desde o último treino de cada grupo, evolução do
  radar e linha do tempo.
- **Tutorial** de uso depois do cadastro (pode ser revisto pelo Perfil).
- **Funciona offline**: tudo é salvo no aparelho primeiro e sincronizado com a nuvem
  quando houver internet.

## Estrutura

```
app/                        telas (expo-router)
  _layout.js                fontes, abertura animada, providers
  index.js                  porta de entrada: login → perguntas iniciais → app
  login.js · register.js    conta
  onboarding.js             perguntas iniciais + revelação do radar
  (tabs)/                   Radar · Treinar · Histórico · Perfil
  exercise/[id].js          detalhe e padrões de um exercício
  subradar/[group].js       detalhe por subgrupo (perna)
src/
  components/               UI (ui.js), radar, calendário, diálogos, tutorial, abertura
  data/                     exercícios + standards embarcados, níveis, objetivos
  engine/                   motor de cálculo (calc) e derivações do radar (selectors)
  services/                 nuvem: cliente Supabase, login (auth) e sincronização (sync)
  state/AppContext.js       conta, perfil, treinos, radar e ações
  storage/store.js          cache local por conta (AsyncStorage)
  utils/date.js             datas em horário local
  theme.js                  design system (cores, tipografia, espaçamentos)
assets/                     ícones, logo e GIFs dos exercícios
supabase/
  migrations/               esquema do banco + regras de segurança (RLS)
  templates/                e-mail de confirmação em português
site/                       página de confirmação de e-mail (GitHub Pages)
docs/                       conceito do app e padrões de força
```

## Backend (Supabase)

Configuração única, feita no painel do projeto no Supabase:

1. **Banco** — *SQL Editor → New query*: cole e rode
   [`supabase/migrations/20261001120000_init.sql`](supabase/migrations/20261001120000_init.sql).
   Cria `profiles`, `workouts` e `workout_entries` com RLS: cada usuário só lê e altera
   as próprias linhas.
2. **Página de confirmação** — *Authentication → URL Configuration*:
   - **Site URL**: `https://fernmoraes.github.io/StatsUp/`
   - **Redirect URLs**: adicione `https://fernmoraes.github.io/StatsUp/`
3. **E-mail em português** — *Authentication → Emails → Confirm signup*: assunto
   `Confirme seu e-mail no StatsUp` e o corpo de
   [`supabase/templates/confirm-signup.html`](supabase/templates/confirm-signup.html).

Como os dados são sincronizados: cada mudança é salva no aparelho e enviada para a
nuvem; ao abrir o app ou entrar, o que estiver pendente é enviado e a nuvem é baixada
como estado oficial. Cada conta só enxerga os próprios dados.

## Página de confirmação (GitHub Pages)

A pasta [`site/`](site/) é publicada em `https://fernmoraes.github.io/StatsUp/` pela
action [`.github/workflows/pages.yml`](.github/workflows/pages.yml) sempre que algo em
`site/` muda. É para onde o link do e-mail de confirmação leva: mostra "e-mail
confirmado", "link expirado" ou uma apresentação do app, conforme o caso.

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

## Licença

**Todos os direitos reservados.** O código pode ser visualizado, mas não pode ser
copiado, modificado ou reutilizado sem autorização dos autores. Componentes de
terceiros (dependências, fontes, ícones e GIFs dos exercícios) seguem as próprias
licenças. Veja [`LICENSE`](LICENSE).

## Notas de modelagem

- Exercícios com tabela completa por peso corporal (supino, terra, agachamento,
  desenvolvimento, rosca, hip thrust) usam `byBW`; os demais usam multiplicador de PC
  (`ratio`) ou valores absolutos (`flat`, p/ reps). Curvas estimadas a partir de 2
  pontos do documento são marcadas com `source: 'modeled'`.
- Halteres unilaterais comparam **por halter** (`per_dumbbell`); nunca somam os dois lados.
- Percentil e 1RM estimado são **persistidos** no registro (com snapshot do peso), então
  o histórico não é reescrito quando o peso corporal muda.
