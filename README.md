# StatsUp 📊💪

Rastreador de academia que transforma sua força em um **radar de 4 eixos** (Peito,
Costas, Braço, Perna). Cada eixo cresce conforme você fica mais forte **em relação à
população** do mesmo sexo e peso corporal — força em **percentil**, não em carga bruta.

Implementação dos documentos `conceito_do_app.md` (produto + motor de cálculo) e
`padroes_de_forca_consolidado.md` (strength standards). Tudo **offline-first**: os
padrões são dados estáticos embarcados e todo cálculo roda localmente.

## Como rodar

```bash
cd StatsUp
npm install            # já configurado com legacy-peer-deps (.npmrc)
npx expo start         # abra no Expo Go (Android/iOS) ou pressione 'a' / 'i'
```

> Requer Node 18+. Os dados ficam no dispositivo via AsyncStorage; "Apagar dados" no
> Perfil zera tudo.

## O que está implementado

| Fase | Entrega |
|---|---|
| 0 — Dados | Catálogo de ~45 exercícios + standards (1RM/reps por sexo, peso e nível) em `src/data/` |
| 1 — Motor | Epley, interpolação de peso, `toPercentile`, `groupScore`, `nextGoal`, idade — `src/engine/calc.js` |
| 2 — Onboarding + Radar | Wizard de 3 passos → primeiro radar com reveal animado (`app/onboarding.js`, `src/components/RadarChart.js`) |
| 3 — Loop diário | Registro de treino, persistência, feedback pós-registro (PR, subida de nível) — `app/(tabs)/log.js` |
| 4 — Inteligência | Elo fraco, próxima meta, insights automáticos, sub-radar de Braço/Perna |
| 5 — Retenção | Histórico, streak, radar hoje vs. ~30 dias atrás |

## Design

Tema escuro premium inspirado em **Whoop, Oura, Strava e Hevy**:

- Tipografia **Inter** (6 pesos) carregada via `expo-font` com splash gate.
- **Gradientes** (`expo-linear-gradient`) em fundos, botões, cards de destaque e no
  preenchimento do radar; "auroras" de fundo e glow colorido nos cards.
- **Glassmorphism**: cards translúcidos com borda hairline (`src/components/ui.js`).
- **Anel de progresso** circular para o score geral (`ProgressRing`, estilo Whoop/Oura).
- Sistema de design centralizado em `src/theme.js` (cores, gradientes, tipografia,
  espaçamento, raios, sombras/glow).

## Arquitetura

```
app/                      rotas (expo-router)
  _layout.js              providers + Stack
  index.js                gate: onboarding vs app
  onboarding.js           wizard + reveal do radar
  (tabs)/                 Radar · Treinar · Histórico · Perfil
  subradar/[group].js     detalhe por subgrupo (braço/perna)
src/
  data/                   levels, exercises (+ standards embarcados), goals
  engine/                 calc (motor) + selectors (derivações do radar)
  state/AppContext.js     profile + logs + ações, radar memoizado
  storage/store.js        AsyncStorage
  components/             RadarChart (SVG) + UI base
  theme.js
```

## O motor (resumo)

```
peso × reps → Epley (1RM est.) → standards do exercício p/ (sexo, peso) com interpolação
            → percentil (interpolação entre níveis) → score do grupo (média ponderada,
              âncora pesa 3×) → eixo do radar
```

Níveis ancoram percentis fixos: Iniciante=P5, Novato=P20, Intermediário=P50,
Avançado=P80, Elite=P95. O **objetivo** do usuário ajusta copy/metas, nunca o tamanho
do eixo.

## Notas de modelagem

- Exercícios com tabela completa por peso corporal (supino, terra, agachamento,
  desenvolvimento, rosca, hip thrust) usam `byBW`; os demais usam multiplicador de PC
  (`ratio`) ou valores absolutos (`flat`, p/ reps). Curvas estimadas a partir de 2
  pontos do documento são marcadas com `source: 'modeled'`.
- Halteres unilaterais comparam **por halter** (`per_dumbbell`); nunca somam os dois lados.
- Percentil e 1RM estimado são **persistidos** no registro (com snapshot do peso), então
  o histórico não é reescrito quando o peso corporal muda.
