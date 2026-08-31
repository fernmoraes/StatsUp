# Conceito e Especificação do App — Rastreador de Academia com Radar de Força

> **Propósito deste documento.** Este `.md` descreve a **ideia, a lógica e as regras** do aplicativo. Ele é o guia mestre para o Claude Code implementar o app. Não fixa stack nem framework — descreve *o que* o app faz e *como* os cálculos funcionam, em fórmulas e pseudocódigo, para que a implementação seja uma decisão posterior.
>
> **Documento irmão (obrigatório):** `padroes_de_forca_consolidado.md` — contém TODOS os strength standards (1RM por sexo, peso corporal e nível) dos quatro grupos musculares. Este documento de conceito **consome** aqueles dados. Os dois devem ser lidos juntos.
>
> **Status:** especificação de produto + motor de cálculo. Agnóstico de stack. Pronto para o Claude Code se guiar.

---

## Índice

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Princípios de design](#2-princípios-de-design)
3. [Glossário](#3-glossário)
4. [Modelo conceitual de dados](#4-modelo-conceitual-de-dados)
5. [O motor de cálculo (coração do app)](#5-o-motor-de-cálculo-coração-do-app)
6. [O Radar Chart](#6-o-radar-chart)
7. [Onboarding](#7-onboarding)
8. [Registro diário (o loop principal)](#8-registro-diário-o-loop-principal)
9. [Inteligência: elo fraco, próxima meta, insights](#9-inteligência-elo-fraco-próxima-meta-insights)
10. [Objetivos do usuário](#10-objetivos-do-usuário)
11. [Telas e fluxos](#11-telas-e-fluxos)
12. [Edge cases e regras de robustez](#12-edge-cases-e-regras-de-robustez)
13. [Roadmap de implementação sugerido](#13-roadmap-de-implementação-sugerido)
14. [Decisões em aberto / pontos de extensão](#14-decisões-em-aberto--pontos-de-extensão)

---

## 1. Visão geral do produto

**O que é:** um rastreador de academia que transforma a força do usuário em um **radar chart de quatro eixos** (Peito, Costas, Braço, Perna). Cada eixo cresce conforme o usuário fica mais forte **em relação à população** do mesmo sexo e peso corporal. Quanto mais "fora da média" (acima do percentil médio), maior o eixo.

**Como funciona, em uma frase:** o usuário informa idade, altura, sexo e peso, responde sobre o objetivo e diz quanto aguenta em alguns exercícios; o app converte cada desempenho em **percentil** (posição na população) usando os strength standards, agrega por grupo muscular e desenha o radar. Todo dia o usuário registra o treino e quanto levantou, e o radar evolui.

**Por que isso é diferente de um tracker comum:** a maioria dos apps mostra carga bruta ("você fez 80 kg no supino"). Este app mostra **significado** ("80 kg te coloca no 67º percentil — você é mais forte que 67% das pessoas do seu perfil, e está a 6 kg de virar Advanced"). O número vira contexto, progresso e meta.

**Plataforma:** pensado como app de fitness pessoal (mobile-first faz sentido, mas o documento é agnóstico). Funciona offline-first; os standards são dados estáticos embarcados.

---

## 2. Princípios de design

Estes princípios guiam toda decisão de implementação. Quando houver dúvida, recorra a eles.

1. **O radar é a verdade da força — nada o distorce.** Nem o objetivo do usuário, nem gamificação. O eixo sempre reflete o percentil real de força. O objetivo muda *o que o app recomenda fazer*, nunca o tamanho do eixo.

2. **Percentil, não carga bruta.** A unidade fundamental do app é o percentil (0–100), normalizado por sexo e peso corporal. Isso torna a comparação justa entre biotipos diferentes e é o que faz "fora da média = maior" funcionar.

3. **Compostos valem mais que isoladores.** Supino, agachamento, remada e desenvolvimento têm mais dados, são mais difíceis de "trapacear" e representam melhor a força real do grupo. Eles pesam mais no score. Isso evita inflar um eixo com exercícios de isolamento feitos com balanço.

4. **Atrito mínimo no onboarding.** Ninguém testa 1RM real, ninguém quer responder 30 perguntas. Pede-se o mínimo para gerar o primeiro radar (4 exercícios-âncora), e a riqueza vem com o uso diário.

5. **Sempre haver um próximo passo.** Todo eixo mostra a próxima meta. Todo radar aponta um elo fraco. O app nunca é um beco sem saída — sempre sugere o que fazer a seguir.

6. **Honestidade científica com gentileza.** Os dados são auto-reportados e estimados; o app comunica progresso sem prometer precisão de laboratório. A idade pode ser usada para uma comparação "gentil" (contra a faixa etária) sem mentir sobre os números.

7. **Offline-first, dados embarcados.** Os strength standards são uma tabela estática. O app calcula tudo localmente; não depende de servidor para funcionar.

---

## 3. Glossário

| Termo | Definição |
|---|---|
| **Standard / padrão de força** | Valor de 1RM esperado para um nível (Beginner→Elite), dado sexo e peso corporal. Vem de `padroes_de_forca_consolidado.md`. |
| **Nível** | Um de cinco: Beginner (P5), Novice (P20), Intermediate (P50), Advanced (P80), Elite (P95). Cada um ancora um percentil. |
| **Percentil (de força)** | Posição do usuário na população (0–100) para um exercício, derivada por interpolação entre os níveis. **A unidade central do app.** |
| **1RM** | Carga máxima para uma repetição. Geralmente **estimada** via Epley a partir de peso×reps. |
| **Exercício-âncora** | O composto principal de cada grupo (supino, remada/barra, agachamento, desenvolvimento). Maior peso no score e usado no onboarding. |
| **Score de grupo** | Percentil agregado (0–100) de um grupo muscular (Peito/Costas/Braço/Perna). É o valor de um eixo do radar. |
| **Score geral** | Média (ou agregação) dos quatro scores de grupo. Um número-resumo da força global. |
| **Elo fraco** | O grupo (ou subgrupo) com menor score relativo — o que o app sugere priorizar. |
| **Próxima meta** | A carga/percentil necessária para o usuário subir de nível em um exercício ou eixo. |
| **Toggle de idade** | Opção que alterna entre comparar o usuário com *todos os adultos* (cru) ou com *a faixa etária dele* (gentil). |

---

## 4. Modelo conceitual de dados

*Tipos descritos de forma agnóstica. O Claude Code pode materializá-los como interfaces TS, structs, classes de banco, etc.*

### 4.1 Perfil do usuário (`UserProfile`)
```
UserProfile {
  id                : ID
  sex               : 'male' | 'female'        // os standards só têm essas duas categorias (ver caveats)
  birth_date        : Date                     // idade derivada daqui
  height_cm         : number
  bodyweight_kg     : number                   // ATUALIZÁVEL; recalcula percentis quando muda
  goal              : Goal                      // ver seção 10
  age_compare_mode  : 'absolute' | 'age_adjusted'  // toggle de idade; default 'absolute'
  created_at        : DateTime
}
```

### 4.2 Catálogo de exercícios (`Exercise`) — estático, vem dos standards
```
Exercise {
  id                : ID                        // estável; RDL/Shrug/Dips compartilham id entre grupos
  name_pt           : string
  name_en           : string
  muscle_group      : 'chest'|'back'|'arm'|'leg'      // os 4 eixos do radar
  sub_group         : 'biceps'|'triceps'|'shoulder'   // só para arm; null nos demais
                      | 'quadriceps'|'hamstrings'|'glutes'|'calves'  // opcional p/ leg
  is_anchor         : boolean                   // composto principal do grupo
  equipment         : 'barbell'|'dumbbell'|'cable'|'machine'|'ezbar'|'smith'|'bodyweight'
  per_dumbbell      : boolean                   // valor é por UM halter
  metric            : 'load' | 'reps' | 'added_weight'  // como o desempenho é medido
  weight_in_score   : number                    // peso no cálculo do score do grupo (ver 5.4)
}
```

### 4.3 Standards (`StandardRow`) — estático, vem de `padroes_de_forca_consolidado.md`
```
StandardRow {
  exercise_id       : ID
  sex               : 'male' | 'female'
  bodyweight_kg     : number                    // 50,60,...,120 (interpolar entre)
  level             : 'beginner'|'novice'|'intermediate'|'advanced'|'elite'
  one_rm_kg         : number                    // OU reps / added_weight_kg conforme metric
  source            : string
}
```
> Os exercícios rep-based (barra fixa, flexão, pistol, nordic) usam `reps` ou `added_weight_kg` em vez de `one_rm_kg`. O motor trata os três casos (ver 5.5).

### 4.4 Registro de treino (`WorkoutLog` / `SetEntry`)
```
WorkoutLog {
  id          : ID
  user_id     : ID
  date        : Date
  entries     : SetEntry[]
  note        : string?            // opcional
}

SetEntry {
  exercise_id : ID
  // o usuário registra UMA destas combinações:
  weight_kg   : number?            // para metric 'load' / 'added_weight'
  reps        : number?            // sempre que possível (alimenta Epley)
  // o motor deriva:
  est_1rm_kg  : number             // calculado (Epley) e persistido
  percentile  : number             // calculado no momento do registro e persistido
  bodyweight_at_log : number       // snapshot do peso na data (percentil depende disso)
}
```
> **Importante:** `percentile` e `est_1rm_kg` são **persistidos** no momento do registro, com snapshot do peso corporal. Isso permite reconstruir a evolução histórica mesmo que o peso do usuário mude depois.

### 4.5 Snapshot do radar (`RadarSnapshot`) — derivado, cacheável
```
RadarSnapshot {
  user_id     : ID
  date        : Date
  chest_score : number   // 0..100
  back_score  : number
  arm_score   : number
  leg_score   : number
  overall     : number
  weakest_link: 'chest'|'back'|'arm'|'leg'
}
```

---

## 5. O motor de cálculo (coração do app)

Esta é a parte mais importante do documento. Todo o resto é UI em volta disto.

### 5.1 Pipeline geral
```
desempenho bruto (peso × reps)
   → estimar 1RM (Epley)
   → buscar standards do exercício para (sexo, peso corporal) com interpolação
   → converter 1RM em percentil (interpolação entre níveis)
   → agregar percentis por grupo (média ponderada, âncora pesa mais)
   → score do grupo (0..100) = eixo do radar
```

### 5.2 Passo 1 — Estimar 1RM (fórmula de Epley)
```
est_1rm = peso × (1 + reps / 30)
```
- Se `reps == 1`, `est_1rm = peso`.
- Limitar `reps` a ≤ 12 para o cálculo de força (acima disso Epley superestima; se reps > 12, usar mesmo assim mas marcar baixa confiança — ver 5.7).
- Para exercícios `per_dumbbell`, o `est_1rm` é **por halter** — comparar com standards que também são por halter. **Não** somar os dois halteres.
- Para exercícios `added_weight` (ex.: barra fixa com peso), `est_1rm` do "added" = peso adicional estimado; a comparação usa as tabelas de `added_weight_kg` (que podem ser negativas = assistência).

### 5.3 Passo 2 — Buscar standards com interpolação de peso corporal
Os standards existem em degraus de 10 kg (50,60,…,120). Para um peso corporal arbitrário `bw`:
```
function standardFor(exercise, sex, bw, level):
    (bw_low, bw_high) = degraus que cercam bw      // ex.: bw=73 → 70 e 80
    v_low  = lookup(exercise, sex, bw_low, level)
    v_high = lookup(exercise, sex, bw_high, level)
    return lerp(v_low, v_high, (bw - bw_low) / (bw_high - bw_low))
```
- `bw < 50` → usar a linha de 50 (clamp) e marcar extrapolação.
- `bw > 120` → usar a linha de 120 (clamp) e marcar extrapolação.
- `lerp(a,b,t) = a + (b-a)·t`.

### 5.4 Passo 3 — Converter 1RM em percentil
Cada nível ancora um percentil fixo: **Beginner=5, Novice=20, Intermediate=50, Advanced=80, Elite=95**.
```
function toPercentile(est_1rm, exercise, sex, bw):
    levels = [beginner, novice, intermediate, advanced, elite]
    pcts   = [5, 20, 50, 80, 95]
    values = [standardFor(exercise, sex, bw, L) for L in levels]   // crescente

    if est_1rm <= values[0]:
        // abaixo de Beginner: interpola entre 0 e P5
        return clamp( (est_1rm / values[0]) * 5 , 0, 5)
    if est_1rm >= values[4]:
        // acima de Elite: satura suavemente em 95..100
        excess = (est_1rm - values[4]) / values[4]
        return clamp( 95 + excess * 50 , 95, 100)   // +50%/unidade; ajustável
    // caso geral: acha o par de níveis que cerca est_1rm e interpola o percentil
    for i in 0..3:
        if values[i] <= est_1rm <= values[i+1]:
            t = (est_1rm - values[i]) / (values[i+1] - values[i])
            return lerp(pcts[i], pcts[i+1], t)
```
> Resultado: um número 0–100. É o coração do app. **Persistir** junto com o log.

### 5.5 Passo 3-bis — Exercícios rep-based (barra fixa, flexão, pistol, nordic)
Para `metric == 'reps'`, os "values" da interpolação são **contagens de repetições** por nível (não kg). A lógica de `toPercentile` é idêntica, só muda a unidade comparada (o `est_1rm` vira `reps_realizadas`). Para barra fixa/dips que têm **ambas** as métricas (reps e added_weight), preferir `added_weight` quando o usuário registrou carga adicional; senão usar `reps`.

### 5.6 Passo 4 — Score do grupo (agregação ponderada)
Para cada grupo (chest/back/arm/leg), pega o **percentil mais recente de cada exercício** que o usuário já registrou naquele grupo e faz média ponderada:
```
function groupScore(group, user):
    entries = latestPercentilePerExercise(group, user)   // 1 valor por exercício
    if entries vazio: return null                         // eixo "sem dados"
    numerador   = Σ (entry.percentile × exercise.weight_in_score)
    denominador = Σ (exercise.weight_in_score)
    return numerador / denominador
```
**Pesos sugeridos (`weight_in_score`):**
- Exercício-âncora composto (supino, remada/barra, agachamento, desenvolvimento): **peso 3**
- Outros compostos (incline, hack squat, leg press, RDL, dips, close-grip): **peso 2**
- Isoladores (rosca, elevação lateral, cadeira extensora, crucifixo, panturrilha): **peso 1**

> Regra anti-distorção: se o grupo só tem isoladores registrados (nenhum composto), marcar o score como **"provisório"** na UI e incentivar registrar o âncora — o número existe, mas com menor confiança.

### 5.7 Confiança do dado (`confidence`)
Cada percentil carrega um nível de confiança, usado na UI (ex.: opacidade, aviso):
- **alta:** reps entre 1–6, exercício composto, peso dentro de 50–120 kg.
- **média:** reps 7–12, ou isolador, ou interpolação normal.
- **baixa:** reps > 12 (Epley superestima), peso extrapolado (<50 ou >120 kg), ou só isoladores no grupo.

### 5.8 Ajuste de idade (toggle)
Se `age_compare_mode == 'age_adjusted'`, multiplica os **standards** (não o desempenho do usuário) pelo coeficiente etário antes de calcular o percentil, deixando a comparação relativa à faixa etária. Coeficientes (de `padroes_de_forca_consolidado.md`, seção 7.4):
```
ageMultiplier(age):
  ≤24 → ~0.97 (interpolar com pico)
  25..40 → 1.00
  45 → 0.95 ; 50 → 0.89 ; 55 → 0.82 ; 60 → 0.75 ; 65 → 0.68 ; 70 → 0.61 ; 80 → 0.49
  (interpolar linearmente entre os pontos)
```
Aplicação: `standard_ajustado = standard × ageMultiplier(idade)`. Como o standard fica menor, o mesmo desempenho rende percentil maior — a comparação "gentil" contra a própria faixa. **Default é `absolute`** (comparar com todos os adultos); o toggle é uma escolha explícita do usuário.

---

## 6. O Radar Chart

### 6.1 Estrutura
- **4 eixos:** Peito, Costas, Braço, Perna. Escala **0–100** (percentil).
- **Área preenchida** = perfil de força do usuário. Quanto maior a área, mais forte/fora da média globalmente.
- **Anéis de referência** desenhados nos percentis dos níveis: 5, 20, 50, 80, 95 — rotulados Beginner→Elite. Isso dá leitura instantânea ("meu peito tá no anel Advanced").
- **Linha da média (P50)** destacada: tudo que ultrapassa o anel 50 está "acima da média".

### 6.2 Por que percentil e não carga
Um homem de 100 kg e uma mulher de 55 kg podem ocupar o mesmo ponto se ambos forem P70 — o radar premia **força relativa ao perfil**, não tamanho absoluto. É o que o produto promete ("mais fora da média = maior").

### 6.3 Sub-radar de Braço (o detalhe que chama atenção)
Ao tocar no eixo **Braço**, abre um sub-radar de 3 pontas: **Bíceps, Tríceps, Ombro**. Calculado igual ao score de grupo, mas filtrando por `sub_group`. Revela desequilíbrios ("seu ombro está em P40 enquanto seu tríceps está em P75"). Opcional fazer o mesmo para **Perna** (Quadríceps/Hamstrings/Glúteos/Panturrilha), já que os dados suportam.

### 6.4 Estados visuais
- **Eixo sem dados:** desenhar no centro (0) com aparência "fantasma" + CTA "registre um exercício de [grupo]".
- **Confiança baixa:** eixo com traço pontilhado ou opacidade reduzida + tooltip explicando.
- **Evolução:** sobrepor o radar de hoje ao de 30/90 dias atrás (silhueta translúcida) para mostrar crescimento — fortíssimo gatilho de motivação.

### 6.5 Animação e "momento uau"
No fim do onboarding, animar o radar crescendo do centro até os valores calculados, revelando os anéis de nível. É o primeiro "presente" que o usuário recebe — caprichar aqui.

---

## 7. Onboarding

**Objetivo:** gerar o primeiro radar com o mínimo de atrito. Sequência:

1. **Dados básicos:** sexo, data de nascimento, altura, peso. (4 campos.)
2. **Objetivo:** escolha única entre as opções da seção 10.
3. **Quatro exercícios-âncora — um por grupo:**
   - Peito → **Supino Reto** (barbell bench press)
   - Costas → **Barra Fixa** (pull-up, rep-based) *ou* **Remada Curvada** se preferir carga
   - Perna → **Agachamento Livre** (back squat)
   - Braço → **Desenvolvimento** (overhead press) — composto que melhor representa o conjunto braço/ombro; alternativamente **Rosca Direta** se o usuário não fizer desenvolvimento
   Para cada um: "Quanto você levanta?" → peso + reps (ou só reps, na barra fixa). Botão "não faço esse exercício" → pula e o eixo nasce vazio (preenche depois).
4. **Gerar radar** com animação (6.5) e já mostrar: score geral, elo fraco e a primeira próxima-meta.

> **Regra:** nunca exigir 1RM real. Sempre peso×reps. Se a pessoa não sabe o peso, oferecer estimativa por categoria ("barra vazia / barra + 1 anilha / …") — opcional.

---

## 8. Registro diário (o loop principal)

O comportamento que faz o usuário voltar todo dia.

1. **Botão grande "Treinei hoje".** Abre o registro do dia.
2. **Escolha de exercícios:** lista completa dos ~80 exercícios (dos 4 relatórios), agrupada por grupo muscular e busca rápida. Aqui entra a **variedade** que você pediu — a pessoa registra o que de fato fez.
3. **Para cada exercício:** peso × reps (ou reps puro). O app calcula `est_1rm` e `percentile` na hora e **persiste**.
4. **Feedback imediato pós-registro:**
   - "Novo recorde de percentil no supino! P67 → P71."
   - Micro-animação do eixo correspondente crescendo no radar.
   - Se subiu de nível: celebração ("Você virou Advanced no agachamento 🎉").
5. **Streak / consistência:** contar dias/semanas treinados. Não é o foco (força é), mas reforça o hábito.
6. **Histórico:** timeline de logs + gráfico de evolução de percentil por exercício e por grupo.

> **Cálculo incremental:** ao registrar, recalcular só o(s) grupo(s) afetado(s) e atualizar o `RadarSnapshot` do dia. Não precisa recomputar tudo.

---

## 9. Inteligência: elo fraco, próxima meta, insights

O que transforma o gráfico bonito em ferramenta viciante.

### 9.1 Elo fraco
```
weakest_link = grupo com menor score entre os que têm dados
```
- Mostrar com enquadramento positivo: "Seu maior potencial de ganho agora é **Costas** (P38). Foco aqui sobe seu score geral rápido."
- No nível de subgrupo (braço/perna), apontar o subgrupo mais atrás ("ombro está atrás do resto do braço").

### 9.2 Próxima meta
Para qualquer eixo/exercício, calcular a carga que leva ao próximo nível:
```
function nextGoal(exercise, sex, bw, current_1rm):
    next_level = primeiro nível cujo standard > current_1rm
    target_1rm = standardFor(exercise, sex, bw, next_level)
    delta_kg   = target_1rm - current_1rm
    return { next_level, target_1rm, delta_kg }
```
- Comunicar: "Faltam **6 kg** no supino para você virar **Advanced** (P80)."
- No radar, a meta pode aparecer como um ponto-alvo no eixo.

### 9.3 Insights automáticos (regras simples, expansível)
- **Desequilíbrio empurrar/puxar:** se `chest_score - back_score > 15`, sugerir volume de costas.
- **Pernas negligenciadas:** se `leg_score` < média dos outros três − 15, alertar (clássico "nunca pula o leg day").
- **Estagnação:** se o percentil de um âncora não sobe há N semanas, sugerir deload/variação.
- **Ganho de força relativa por mudança de peso:** se o usuário perdeu peso e manteve carga, parabenizar pelo aumento de força relativa.
- **Confiança baixa dominando um eixo:** se o eixo é sustentado só por isoladores, sugerir registrar o âncora.

### 9.4 Comparações (opcional, fase 2)
- "Você está mais forte que 67% das pessoas do seu perfil." (já é o percentil — fácil de comunicar.)
- Ranqueamento entre amigos / coortes por score geral, se houver social.

---

## 10. Objetivos do usuário

O objetivo **não distorce o radar** — ajusta recomendações, metas e copy. Opções e efeitos:

| Objetivo | Efeito no app |
|---|---|
| **Força máxima** | Metas focam em subir percentil dos âncoras; insights priorizam progressão de carga; faixa de reps sugerida 1–6. |
| **Hipertrofia** | Recomendações citam variedade de exercícios por grupo e EMG (ex.: "para peito superior, incline 30°"); faixa 6–12 reps; valoriza volume/variedade no registro. |
| **Resistência / condicionamento** | Menor ênfase em 1RM; pode exibir métrica de reps/volume; metas de percentil ainda existem mas com copy diferente. |
| **Emagrecimento / recomposição** | Destaca força *relativa* (ganho de percentil ao manter carga perdendo peso); celebra manter força durante cutting. |
| **Saúde geral / iniciante** | Linguagem mais suave; metas curtas; foco em consistência e em sair de "abaixo da média". |

> A camada de EMG e biomecânica do documento de dados (seção 8 de `padroes_de_forca_consolidado.md`) alimenta as recomendações de *seleção de exercício* por objetivo — ex.: hipertrofia de tríceps → extensão overhead (cabeça longa); glúteo → hip thrust; sóleo → panturrilha sentada.

---

## 11. Telas e fluxos

Lista mínima de telas (o Claude Code define a navegação concreta):

1. **Onboarding** (seção 7) — wizard de 3 passos + reveal do radar.
2. **Home / Radar** — o radar de 4 eixos, score geral, elo fraco, próxima meta em destaque, botão "Treinei hoje".
3. **Sub-radar** — ao tocar num eixo (braço/perna), abre o detalhamento por subgrupo.
4. **Registrar treino** — seleção de exercícios + entrada de peso×reps + feedback imediato.
5. **Histórico** — timeline de treinos + gráficos de evolução (percentil por exercício/grupo, radar de hoje vs. passado).
6. **Detalhe do exercício** — standards do exercício para o perfil do usuário, posição atual, próxima meta, recordes pessoais, dica de execução/EMG.
7. **Perfil / Ajustes** — editar peso (recalcula), objetivo, toggle de idade, unidades (kg/lb).

### Fluxo central (resumido)
```
Onboarding → Radar (home) → [Treinei hoje] → Registrar → feedback + radar atualizado → volta pra Home
                ↑                                                                          │
                └──────────────────────  loop diário  ───────────────────────────────────┘
```

---

## 12. Edge cases e regras de robustez

- **Peso corporal fora de 50–120 kg:** clamp na linha extrema + marcar extrapolação (confiança baixa).
- **Reps muito altas (>12):** calcular mesmo assim, mas confiança baixa (Epley superestima 1RM).
- **Usuário sem dados num grupo:** eixo "fantasma" em 0, com CTA. Não conta como P0 no score geral (excluir da média de `overall`, ou marcar `overall` como parcial).
- **Exercícios compartilhados (RDL, Shrug, Dips):** um único `exercise_id`; ao computar score, contar no `muscle_group` primário definido no catálogo para não dobrar peso.
- **`per_dumbbell`:** comparar valor por halter com standard por halter. Nunca somar os dois lados.
- **Mudança de peso corporal:** novos logs usam o peso novo; logs antigos mantêm o `percentile`/`bodyweight_at_log` persistidos (histórico não é reescrito). O radar "atual" usa o percentil mais recente de cada exercício.
- **Máquinas (leg press, hack, chest press, pec deck):** avisar que a comparação absoluta entre academias é imprecisa; tratar como progressão pessoal. Não usar máquina como único sustentáculo de um eixo se houver alternativa de barra.
- **Sexo:** os standards só têm 'male'/'female'. Para usuários não-binários/trans, permitir escolher contra qual tabela comparar, com aviso claro de que é uma limitação dos dados (ver caveats do doc de dados).
- **1 rep registrada com peso anormalmente alto (typo):** sanity check — se o `est_1rm` ultrapassar ~120% do Elite, pedir confirmação ("tem certeza? isso seria recorde mundial").
- **Unidades:** suportar kg e lb na UI; armazenar internamente sempre em kg.

---

## 13. Roadmap de implementação sugerido

Ordem que dá valor rápido e mantém o motor sólido:

**Fase 0 — Fundação de dados**
1. Converter `padroes_de_forca_consolidado.md` em dados estruturados (JSON/CSV/seed de banco): tabelas `exercises` e `standards`. *(Próximo entregável natural.)*
2. Definir `weight_in_score`, `is_anchor`, `metric` e `sub_group` por exercício no catálogo.

**Fase 1 — Motor de cálculo (sem UI)**
3. Implementar e testar: Epley, interpolação de peso, `toPercentile`, `groupScore`, `nextGoal`, `ageMultiplier`. Cobrir com testes usando exemplos das tabelas.

**Fase 2 — Onboarding + Radar estático**
4. Wizard de onboarding (4 âncoras) → primeiro `RadarSnapshot` → render do radar com anéis de nível.

**Fase 3 — Loop diário**
5. Registro de treino, persistência de logs, recálculo incremental, feedback pós-registro.

**Fase 4 — Inteligência**
6. Elo fraco, próxima meta, insights automáticos, sub-radar de braço/perna.

**Fase 5 — Evolução e retenção**
7. Histórico, radar hoje-vs-passado, streaks, recordes pessoais.

**Fase 6 — Extras**
8. Social/ranking, recomendação de exercícios por EMG/objetivo, export de dados.

---

## 14. Decisões em aberto / pontos de extensão

Pontos que valem uma decisão consciente do dev (não bloqueiam o MVP):

- **Saturação acima de Elite:** a fórmula satura P95→P100 com +50% por unidade (5.4). Ajustar a inclinação conforme o quão "raro" você quer que o topo do radar seja.
- **Agregação do `overall`:** média simples dos 4 eixos vs. média ponderada (ex.: dar mais peso a pernas/costas por serem grupos maiores). MVP: média simples.
- **Recência dos percentis:** usar sempre o último registro de cada exercício, ou uma média móvel/melhor-de-N? MVP: último registro (mais simples e responsivo).
- **Decaimento por inatividade:** o radar deve "encolher" se a pessoa some por meses? Decisão de produto — pode desmotivar. MVP: não decai; mostra "última atualização há X".
- **Sub-radar de perna:** implementar já ou deixar para depois (os dados suportam ambos).
- **Multiplicadores de idade abaixo de 24 e acima de 80:** definir a curva exata nos extremos.
- **Confiança como nota numérica vs. categórica:** o doc usa alta/média/baixa; pode virar score 0–1 se preferir.

---

*Fim do documento de conceito. Use junto com `padroes_de_forca_consolidado.md` (os dados). Próximo entregável natural: converter os standards em JSON/seed (Fase 0).*
