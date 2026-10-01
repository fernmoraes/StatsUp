# Padrões de Força — Base de Dados Consolidada para App de Fitness

> **Documento mestre.** Consolidação integral dos quatro relatórios da série — Peito, Costas, Braços/Ombros e Pernas — sem perda de dados. Todas as tabelas de *strength standards* (1RM), os dados de ativação muscular (EMG), a biomecânica e os schemas de banco de dados foram preservados e unificados. Pronto para conversão em JSON/CSV/tabelas e para passar ao Claude Code.
>
> **Fontes primárias:** Strength Level (strengthlevel.com, dezenas de milhões de levantamentos auto-reportados), ExRx.net (Dr. Lon Kilgore), Fitness Volt (OpenPowerlifting, 2,5M+ resultados de competição), Symmetric Strength, StrengthLog, mais literatura peer-reviewed de EMG/biomecânica. Data de referência: junho de 2026.

---

## Índice

1. [Convenções globais de dados](#1-convenções-globais-de-dados)
2. [Metodologia das fontes](#2-metodologia-das-fontes)
3. [PEITO (Peitoral)](#3-peito-peitoral)
4. [COSTAS (Dorsais / Cadeia Posterior)](#4-costas-dorsais--cadeia-posterior)
5. [BRAÇOS E OMBROS (Bíceps, Tríceps, Deltoides)](#5-braços-e-ombros-bíceps-tríceps-deltoides)
6. [PERNAS (Quadríceps, Hamstrings, Glúteos, Panturrilhas, Adutores/Abdutores)](#6-pernas-quadríceps-hamstrings-glúteos-panturrilhas-adutoresabdutores)
7. [Influência das variáveis — síntese transversal (gênero, peso, altura, idade)](#7-influência-das-variáveis--síntese-transversal)
8. [Ativação muscular (EMG) — síntese transversal](#8-ativação-muscular-emg--síntese-transversal)
9. [Escala alométrica (Wilks, DOTS, IPF GL)](#9-escala-alométrica-wilks-dots-ipf-gl)
10. [Schema de banco de dados unificado](#10-schema-de-banco-de-dados-unificado)
11. [Recomendações de implementação](#11-recomendações-de-implementação)
12. [Caveats globais](#12-caveats-globais)

---

## 1. Convenções globais de dados

Estas convenções valem para TODAS as tabelas do documento, salvo indicação local em contrário:

- **Todos os valores numéricos de carga são 1RM** (uma repetição máxima), estimado ou medido, salvo quando a coluna indica `reps` (repetições no peso corporal) ou `added_weight_kg` (peso adicional no cinto, podendo ser negativo = assistência).
- **Barras incluem o peso da barra (~20 kg/44 lb).**
- **Halteres marcados como "PER DUMBBELL" = carga de UM halter (um membro)**, já incluindo ~2 kg da barra do halter. A carga total bimanual ≈ 2×.
- **Cabos e máquinas = peso na pilha** (relação 1:1 assumida); **não são comparáveis entre fabricantes** (alavancas/polias diferentes).
- **Conversão kg → lb:** multiplicar por **2,20462**. (Ex.: 100 kg = 220 lb.)
- **Razão de peso corporal (`bodyweight_ratio`) = 1RM ÷ peso corporal.**
- **Faixas de peso corporal (BW) tabeladas:** 50, 60, 70, 80, 90, 100, 110, 120 kg. Para pesos intermediários, **interpolar linearmente**.

**Definição dos cinco níveis (padrão Strength Level, constante em todo o documento):**

| Nível | Percentil | Significado |
|---|---|---|
| Beginner | > 5% dos praticantes | ≥ ~1 mês de prática |
| Novice | > 20% | ~6 meses |
| Intermediate | > 50% (**a "média" da comunidade**) | ~2 anos |
| Advanced | > 80% | 5+ anos |
| Elite | > 95% | nível competitivo |

> O **ExRx.net** usa rótulos análogos (Untrained, Novice, Intermediate, Advanced, Elite) porém é **mais conservador** nos níveis Intermediate/Advanced. Quando ambas as fontes aparecem, são mantidas com `source` distinto.

---

## 2. Metodologia das fontes

**Strength Level (strengthlevel.com):** base comunitária de mais de 153 milhões de levantamentos auto-reportados. Define os níveis por percentil em cada faixa de peso/sexo (5/20/50/80/95%). Volume por exercício citado ao longo do documento (ex.: supino 48.420.918 lifts; deadlift 22.866.078; squat 24.851.640). Os dados são dinâmicos (mudam com o tempo) e refletem pessoas que treinam — não a população geral.

**ExRx.net:** tabelas fornecidas pelo Dr. Lon Kilgore, PhD, baseadas em ~70 anos de dados de desempenho acumulados — *"based on nearly 70 years of accumulated performance data and are not predicted or regression derived"*. Mais conservador. Inclui também recorde mundial por classe de peso.

**Fitness Volt (FVCP):** ancora seus padrões em 2,5 milhões+ de resultados de competição verificados do OpenPowerlifting, com normalização tipo Wilks/Vanderburgh & Batterham e fator de idade McCulloch. Exercícios acessórios são **modelados** (ratio-derived dos lifts âncora).

**Symmetric Strength / StrengthLog / Gravitus:** fontes secundárias de corroboração (datasets auto-reportados). A StrengthLog tende a reportar médias um pouco mais conservadoras (ex.: overhead press).

**Literatura peer-reviewed:** usada para EMG, biomecânica e diferenças entre sexos (Nuzzo 2023, Contreras 2015, Maeo 2021/2023, Youdas 2010, Escamilla 2002, Campos 2020, entre outros — todos citados nas seções correspondentes).

---

## 3. PEITO (Peitoral)

*Fonte primária: Strength Level (supino baseado em 48.420.918 levantamentos) e ExRx.net. Ativação por porção do peitoral (clavicular/superior, esternal/média, esternocostal/inferior) na seção 8.*

**Hierarquia de carga (homem intermediário, ~80-90 kg PC):** Decline (1,25×) ≈ Bench/Smith/Machine Press (1,25×) > Incline (1,00×) ≈ Machine Fly (1,00×) > Cable Fly (0,50×) ≈ Dumbbell Bench (0,50×/halter) > Dumbbell Fly (0,30×).

### 3.1 Supino Reto Plano — Barbell Bench Press (exercício âncora)

**Resumo (Strength Level):**

| Sexo | Nível | kg | lbs | Razão PC |
|------|-------|-----|-----|----------|
| M | Beginner | 47 | 104 | 0.50x |
| M | Novice | 70 | 154 | 0.75x |
| M | Intermediate | 98 | 216 | 1.25x |
| M | Advanced | 132 | 291 | 1.75x |
| M | Elite | 169 | 373 | 2.00x |
| F | Beginner | 17 | 37 | 0.25x |
| F | Novice | 31 | 68 | 0.50x |
| F | Intermediate | 51 | 112 | 0.75x |
| F | Advanced | 74 | 163 | 1.00x |
| F | Elite | 101 | 223 | 1.50x |

**Médias da comunidade:** homem 98 kg / 217 lb, mulher 51 kg / 111 lb (ambos Intermediate, 50º percentil).

**Homens — 1RM por peso corporal (kg):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---------|-----|-----|-----|-----|-------|
| 50 | 24 | 38 | 57 | 79 | 103 |
| 60 | 34 | 51 | 72 | 96 | 123 |
| 70 | 44 | 62 | 85 | 112 | 141 |
| 80 | 53 | 74 | 98 | 127 | 157 |
| 90 | 62 | 84 | 111 | 141 | 172 |
| 100 | 71 | 94 | 122 | 153 | 187 |
| 110 | 80 | 104 | 133 | 166 | 200 |
| 120 | 88 | 113 | 143 | 177 | 213 |

**Mulheres — 1RM por peso corporal (kg):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---------|-----|-----|-----|-----|-------|
| 50 | 12 | 24 | 40 | 59 | 82 |
| 60 | 17 | 29 | 47 | 68 | 92 |
| 70 | 20 | 34 | 53 | 75 | 101 |
| 80 | 24 | 39 | 59 | 82 | 109 |
| 90 | 28 | 44 | 64 | 89 | 116 |
| 100 | 31 | 48 | 69 | 95 | 123 |
| 110 | 34 | 52 | 74 | 100 | 129 |
| 120 | 37 | 56 | 79 | 106 | 135 |

### 3.2 Supino Inclinado — Incline Barbell Bench Press

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 44 | 64 | 89 | 118 | 149 |
| M razão | 0.50x | 0.75x | 1.00x | 1.50x | 1.75x |
| F (kg) | 13 | 26 | 44 | 67 | 93 |
| F razão | 0.20x | 0.40x | 0.65x | 1.00x | 1.40x |

**Homens — por PC (Int kg):** 50→49, 60→63, 70→76, 80→88, 90→100, 100→111, 110→121, 120→131.
**Mulheres — por PC (Int kg):** 50→33, 60→40, 70→46, 80→52, 90→57, 100→62, 110→67, 120→71.
O incline é tipicamente 75-85% do supino plano.

### 3.3 Supino Declinado — Decline Barbell Bench Press

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 50 | 75 | 106 | 142 | 181 |
| M razão | 0.50x | 1.00x | 1.25x | 1.75x | 2.25x |
| F (kg) | 18 | 33 | 55 | 82 | 112 |
| F razão | 0.25x | 0.50x | 0.75x | 1.25x | 1.75x |

**Homens — por PC (Int kg):** 50→58, 60→75, 70→90, 80→105, 90→118, 100→131, 110→144, 120→155.
**Mulheres — por PC (Int kg):** 50→42, 60→50, 70→57, 80→63, 90→69, 100→75, 110→80, 120→85.
O declinado permite a maior carga média entre as variações de supino (homem 106 kg vs 98 kg no plano).

### 3.4 Supino Reto com Halteres — Dumbbell Bench Press (PER DUMBBELL)

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 16 | 27 | 41 | 58 | 78 |
| M razão | 0.20x | 0.35x | 0.50x | 0.75x | 1.00x |
| F (kg) | 6 | 12 | 21 | 32 | 46 |
| F razão | 0.10x | 0.20x | 0.30x | 0.50x | 0.70x |

**Homens — por PC (Int kg/halter):** 50→26, 60→32, 70→37, 80→42, 90→46, 100→51, 110→55, 120→59.
**Mulheres — por PC (Int kg/halter):** 50→17, 60→19, 70→22, 80→24, 90→27, 100→29, 110→31, 120→33.

### 3.5 Supino Inclinado com Halteres — Incline Dumbbell Bench Press (PER DUMBBELL)

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 19 | 28 | 39 | 53 | 68 |
| M razão | 0.25x | 0.35x | 0.50x | 0.65x | 0.85x |
| F (kg) | 7 | 12 | 20 | 30 | 40 |
| F razão | 0.10x | 0.20x | 0.30x | 0.45x | 0.60x |

Base: 2.341.484 levantamentos.

### 3.6 Crucifixo com Halteres — Dumbbell Fly (PER DUMBBELL)

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 6 | 13 | 24 | 37 | 52 |
| M razão | 0.10x | 0.15x | 0.30x | 0.50x | 0.70x |
| F (kg) | 3 | 7 | 12 | 19 | 27 |
| F razão | 0.05x | 0.10x | 0.20x | 0.30x | 0.45x |

Base: 343.741 levantamentos.

### 3.7 Crossover / Crucifixo na Polia — Cable Fly/Crossover (por lado/pilha)

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 5 | 18 | 39 | 68 | 103 |
| M razão | 0.05x | 0.25x | 0.50x | 0.85x | 1.35x |
| F (kg) | 3 | 10 | 20 | 35 | 53 |
| F razão | 0.05x | 0.15x | 0.30x | 0.55x | 0.80x |

**Homens — por PC (Int kg):** 50→21, 60→28, 70→34, 80→40, 90→46, 100→51, 110→57, 120→62. Base: 197.647 levantamentos. (No Strength Level "Cable Crossover" e "Cable Fly" são páginas vinculadas com valores próximos; adotar uma como canônica.)

### 3.8 Mergulho/Paralelas — Chest Dips (REPS + added_weight_kg)

Base: 2.147.179 levantamentos.

**Repetições (homem):** Beg <1, Nov 8, Int 20, Adv 34, Elite 49.
**Repetições (mulher):** Beg <1, Nov <1, Int 10, Adv 22, Elite 35.

**1RM com peso adicional (homem, kg adicionado sobre o PC):** Beg −8 (assistência), Nov +18, Int +50, Adv +86, Elite +125.
**1RM com peso adicional (mulher):** Beg −20, Nov −3, Int +19, Adv +45, Elite +72.

Negativo = assistência (peso retirado); positivo = peso no cinto. Ex.: homem 80 kg, Int = +51 kg no cinto.

### 3.9 Supino na Máquina / Chest Press — Machine Chest Press

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 32 | 57 | 90 | 131 | 177 |
| M razão | 0.50x | 0.75x | 1.25x | 1.75x | 2.25x |
| F (kg) | 10 | 21 | 38 | 59 | 84 |
| F razão | 0.15x | 0.30x | 0.55x | 0.90x | 1.25x |

Base: 816.894 levantamentos. Média: homem 90 kg / 198 lb, mulher 38 kg / 83 lb.

### 3.10 Pec Deck / Voador na Máquina — Machine Chest Fly

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 34 | 57 | 87 | 124 | 166 |
| M razão | 0.50x | 0.75x | 1.00x | 1.50x | 2.00x |
| F (kg) | 11 | 23 | 40 | 62 | 87 |
| F razão | 0.15x | 0.35x | 0.60x | 0.90x | 1.30x |

Base: 483.115 levantamentos. Média: homem 87 kg / 192 lb, mulher 40 kg / 89 lb.

### 3.11 Supino no Smith — Smith Machine Bench Press

| Sexo | Beg | Nov | Int | Adv | Elite |
|------|-----|-----|-----|-----|-------|
| M (kg) | 46 | 69 | 97 | 130 | 166 |
| M razão | 0.50x | 1.00x | 1.25x | 1.75x | 2.25x |
| F (kg) | 17 | 31 | 52 | 77 | 106 |
| F razão | 0.25x | 0.50x | 0.75x | 1.25x | 1.50x |

**Homens — por PC (Int kg):** 50→62, 60→75, 70→88, 80→99, 90→110, 100→120, 110→130, 120→139. Base: 338.939 levantamentos.

### 3.12 Flexões — Push-ups (REPS)

Base: 2.909.040 levantamentos. Média (Intermediate): homem 41 reps, mulher 19 reps. Variações: incline (homem 34 / mulher 16), decline (28 / 16), diamond (24 / 13), close-grip (31 / 16), one-arm (11 / 9).

### 3.13 Médias populacionais — ExRx.net (supino reto, 18-39 anos)

**Homens (kg de 1RM por PC):**

| PC (kg) | Untrained | Novice | Intermediate | Advanced | Elite |
|---------|-----------|--------|--------------|----------|-------|
| 52 | 37.5 | 50.0 | 60.0 | 82.5 | 100.0 |
| 60 | 45.0 | 57.5 | 70.0 | 95.0 | 117.5 |
| 75 | 55.0 | 70.0 | 85.0 | 115.0 | 145.0 |
| 90 | 62.5 | 80.0 | 97.5 | 132.5 | 162.5 |
| 100 | 62.5 | 82.5 | 102.5 | 137.5 | 172.5 |
| 110 | 65.0 | 85.0 | 105.0 | 142.5 | 180.0 |

**Mulheres (kg de 1RM por PC):**

| PC (kg) | Untrained | Novice | Intermediate | Advanced | Elite |
|---------|-----------|--------|--------------|----------|-------|
| 44 | 22.5 | 30.0 | 35.0 | 42.5 | 52.5 |
| 52 | 27.5 | 35.0 | 37.5 | 50.0 | 62.5 |
| 60 | 32.5 | 40.0 | 42.5 | 57.5 | 67.5 |
| 75 | 37.5 | 42.5 | 52.5 | 65.0 | 85.0 |
| 90 | 40.0 | 52.5 | 60.0 | 75.0 | 95.0 |

Referência prática: homem destreinado ≈ 1 plate por lado (60 kg/135 lb); mulher destreinada ≈ 29 kg/65 lb.

---

## 4. COSTAS (Dorsais / Cadeia Posterior)

*Fonte primária: Strength Level (deadlift 22.866.078 lifts; barra fixa 4.814.965; remada curvada 2.149.712; puxada 1.994.199; remada sentada 706.019; remada halter 921.374; sumô 849.267). Particularidade: o gap de gênero é MENOR na cadeia posterior, e braços longos/tronco curto FAVORECEM o terra (oposto do supino).*

### 4.1 Deadlift Convencional (Levantamento Terra) — Barra (exercício âncora)

| Nível | M (×PC) | F (×PC) |
|---|---|---|
| Beginner | 1.00 | 0.50 |
| Novice | 1.50 | 1.00 |
| Intermediate | 2.00 | 1.25 |
| Advanced | 2.50 | 1.75 |
| Elite | 3.00 | 2.50 |

**Médias da comunidade:** homens 152 kg / 335 lb; mulheres 87 kg / 192 lb.

**Homens — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 50 | 44 / 97 | 65 / 143 | 93 / 205 | 125 / 276 | 160 / 353 |
| 60 | 58 / 128 | 83 / 183 | 114 / 251 | 149 / 328 | 187 / 412 |
| 70 | 73 / 161 | 100 / 220 | 133 / 293 | 171 / 377 | 212 / 467 |
| 80 | 86 / 190 | 116 / 256 | 151 / 333 | 192 / 423 | 235 / 518 |
| 90 | 99 / 218 | 131 / 289 | 168 / 370 | 211 / 465 | 256 / 564 |
| 100 | 111 / 245 | 145 / 320 | 184 / 406 | 228 / 503 | 275 / 606 |
| 110 | 123 / 271 | 158 / 348 | 199 / 439 | 245 / 540 | 293 / 646 |
| 120 | 134 / 295 | 171 / 377 | 213 / 470 | 261 / 575 | 311 / 686 |

**Mulheres — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 50 | 31 / 68 | 49 / 108 | 73 / 161 | 102 / 225 | 133 / 293 |
| 60 | 37 / 82 | 57 / 126 | 83 / 183 | 113 / 249 | 146 / 322 |
| 70 | 43 / 95 | 64 / 141 | 91 / 201 | 123 / 271 | 157 / 346 |
| 80 | 48 / 106 | 71 / 157 | 99 / 218 | 132 / 291 | 168 / 370 |
| 90 | 53 / 117 | 77 / 170 | 106 / 234 | 140 / 309 | 177 / 390 |
| 100 | 58 / 128 | 82 / 181 | 112 / 247 | 147 / 324 | 185 / 408 |

**Idade (homens, multiplicadores sobre o pico):** pico 25-40 anos (152 kg Int). 45 ≈ 0,95 (144), 50 ≈ 0,89 (135), 60 ≈ 0,75 (114), 70 ≈ 0,61 (93), 80 ≈ 0,49 (74).

### 4.2 Sumo Deadlift — Barra

Razões: M Beg 1.25 / Nov 1.5 / Int 2.25 / Adv 2.75 / Elite 3.5. F Beg 0.75 / Nov 1.0 / Int 1.5 / Adv 2.0 / Elite 2.5. Médias: homens 165 kg / 364 lb, mulheres 93 kg / 205 lb.

**Homens — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 70 | 84 / 185 | 114 / 251 | 150 / 331 | 191 / 421 | 235 / 518 |
| 80 | 99 / 218 | 131 / 289 | 170 / 375 | 213 / 470 | 259 / 571 |
| 90 | 113 / 249 | 147 / 324 | 188 / 414 | 234 / 516 | 282 / 622 |
| 100 | 126 / 278 | 162 / 357 | 205 / 452 | 253 / 558 | 303 / 668 |
| 110 | 139 / 306 | 177 / 390 | 222 / 489 | 271 / 597 | 323 / 712 |

**Mulheres:** Int médio 93 kg; PC 60 kg ≈ 91 kg Int; PC 80 kg ≈ 104 kg Int. Padrões ~10-12% acima do convencional (ROM menor).

### 4.3 Romanian Deadlift (RDL) — Barra

Médias: homens 120 kg / 265 lb (Int, ~1.5×); mulheres 66 kg / 146 lb. Beginner: homem 55 kg / 121 lb, mulher 29 kg / 63 lb. Variante halter (PER DUMBBELL): homem médio 41 kg, mulher 26 kg. *(Aparece também na seção 6 como lift de hamstring — mesmo `exercise_id`.)*

### 4.4 Barbell Row / Remada Curvada (inclui base do Pendlay Row)

Razões: M Beg 0.5 / Nov 0.75 / Int 1.0 / Adv 1.5 / Elite 1.75. F Beg 0.25 / Nov 0.40 / Int 0.65 / Adv 0.90 / Elite 1.20. Médias: homens 85 kg / 188 lb, mulheres 41 kg / 91 lb.

**Homens — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 60 | 29 / 64 | 44 / 97 | 63 / 139 | 86 / 190 | 110 / 243 |
| 70 | 37 / 82 | 54 / 119 | 75 / 165 | 99 / 218 | 126 / 278 |
| 80 | 45 / 99 | 63 / 139 | 86 / 190 | 112 / 247 | 140 / 309 |
| 90 | 52 / 115 | 72 / 159 | 96 / 212 | 123 / 271 | 153 / 337 |
| 100 | 60 / 132 | 80 / 176 | 106 / 234 | 134 / 295 | 165 / 364 |

**Mulheres — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 50 | 13 / 29 | 22 / 49 | 36 / 79 | 52 / 115 | 71 / 157 |
| 60 | 15 / 33 | 25 / 55 | 39 / 86 | 57 / 126 | 76 / 168 |
| 70 | 17 / 37 | 28 / 62 | 43 / 95 | 61 / 134 | 80 / 176 |
| 80 | 19 / 42 | 31 / 68 | 46 / 101 | 64 / 141 | 85 / 187 |

*O Pendlay Row usa cargas próximas ou ligeiramente abaixo da remada curvada estrita; o Strength Level agrupa a maioria em "Bent Over Row".*

### 4.5 Dumbbell Row (Remada Unilateral com Halter) — PER DUMBBELL

Razões: M Beg 0.20 / Nov 0.35 / Int 0.55 / Adv 0.80 / Elite 1.05. F Beg 0.10 / Nov 0.20 / Int 0.35 / Adv 0.50 / Elite 0.65. Médias: homens 43 kg / 95 lb/halter, mulheres 21 kg / 46 lb/halter.

**Homens — 1RM por halter, por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 70 | 15 / 33 | 25 / 55 | 38 / 84 | 54 / 119 | 73 / 161 |
| 80 | 18 / 40 | 30 / 66 | 44 / 97 | 61 / 134 | 81 / 179 |
| 90 | 22 / 49 | 34 / 75 | 49 / 108 | 68 / 150 | 88 / 194 |
| 100 | 25 / 55 | 38 / 84 | 55 / 121 | 74 / 163 | 95 / 209 |

### 4.6 Pull-ups (Barra Fixa, pegada pronada) — REPS + added_weight_kg

**Reps (máx. no PC):**

| Nível | M (reps) | F (reps) |
|---|---|---|
| Beginner | <1 | <1 |
| Novice | 5 | <1 |
| Intermediate | 14 | 6 |
| Advanced | 25 | 15 |
| Elite | 37 | 26 |

**1RM com peso adicionado (homens, kg / lb; negativo = assistência):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 60 | -8 / -18 | +9 / +20 | +29 / +64 | +51 / +112 | +74 / +163 |
| 70 | -7 / -15 | +11 / +24 | +32 / +71 | +56 / +123 | +81 / +179 |
| 80 | -7 / -15 | +12 / +26 | +35 / +77 | +60 / +132 | +86 / +190 |
| 90 | -8 / -18 | +13 / +29 | +36 / +79 | +62 / +137 | +90 / +198 |
| 100 | -9 / -20 | +13 / +29 | +37 / +82 | +64 / +141 | +93 / +205 |

**1RM com peso adicionado (mulheres, kg):** PC 60 → Nov −5, Int +10, Adv +26, Elite +43; PC 70 → Int +10, Adv +28, Elite +46.

**Médias populacionais:** homem destreinado precisa ~2 kg de assistência para 1 rep; a maioria dos homens destreinados faz 0-3 barras (8+ = intermediário). Mulheres destreinadas 1-3 reps (8+ = avançado).

### 4.7 Chin-ups (pegada supinada) — REPS + added_weight_kg

Reps masculinas ≈ barra fixa: Int 14, Adv 25, Elite 37 (homem 180 lb ≈ 13 reps Int). Mulheres Int 6. Chin-up é ~10-20% mais "fácil" pela maior contribuição do bíceps (78-96% MVIC, Youdas 2010).

### 4.8 Lat Pulldown (Puxada Alta no Cabo)

Razões: M Beg 0.5 / Nov 0.75 / Int 1.0 / Adv 1.5 / Elite 1.75. F Beg 0.30 / Nov 0.45 / Int 0.70 / Adv 0.95 / Elite 1.30. Médias: homens 82 kg / 181 lb, mulheres 46 kg / 101 lb.

**Homens — 1RM por PC (kg / lb):**

| PC (kg) | Beginner | Novice | Intermediate | Advanced | Elite |
|---|---|---|---|---|---|
| 60 | 31 / 68 | 47 / 104 | 67 / 148 | 92 / 203 | 118 / 260 |
| 70 | 37 / 82 | 54 / 119 | 76 / 168 | 101 / 223 | 129 / 284 |
| 80 | 42 / 93 | 61 / 134 | 84 / 185 | 110 / 243 | 139 / 306 |
| 90 | 47 / 104 | 67 / 148 | 91 / 201 | 119 / 262 | 149 / 328 |
| 100 | 52 / 115 | 72 / 159 | 97 / 214 | 126 / 278 | 157 / 346 |

**Mulheres:** PC 60 → Int 44; PC 70 → Int 47; PC 80 → Int 50 kg. Variantes: Close Grip (homem médio 46 kg Beg), Reverse Grip (homem Beg 42 kg).

### 4.9 Seated Cable Row (Remada Sentada no Cabo)

Médias: homens 86 kg / 189 lb (~1.05× no homem de 180 lb), mulheres 47 kg / 104 lb. Beginner: homem 41 kg / 89 lb, mulher 20 kg / 44 lb. Razão Int masculina ≈ 1.0-1.1×; feminina ≈ 0.70-0.74×. Variante One Arm: homem médio 59 kg, mulher 28 kg (por braço).

### 4.10 T-Bar Row

Médias: homens ~89 kg / 197 lb, mulheres ~47 kg / 105 lb. Beginner: homem 37 kg / 81 lb, mulher 16 kg / 36 lb. Faixas de razão (Endura): homens 0.80-1.38× PC, mulheres 0.63-1.09× PC.

### 4.11 Machine Row (Chest-Supported / estilo Hammer Strength)

Médias: homens ~100 kg / 222 lb, mulheres ~53 kg / 117 lb. Beginner: homem 38 kg / 84 lb, mulher 17 kg / 37 lb. *Cargas de máquina não comparáveis entre fabricantes.* Variante Chest-Supported Dumbbell Row (PER DUMBBELL): homem médio 37 kg, mulher 21 kg.

### 4.12 Acessórios (Trapézio, deltoide posterior, eretores)

| Exercício | Métrica | Homem médio (Int) | Mulher média (Int) | Beginner Homem |
|---|---|---|---|---|
| Barbell Shrug | barra, 1RM | ~133 kg (1.6× PC; 292 lb @180 lb) | ~64 kg | 46 kg (101 lb) |
| Dumbbell Shrug | PER DUMBBELL | 46 kg (102 lb) | 27 kg (59 lb) | 14 kg (32 lb) |
| Behind-the-Back Barbell Shrug | barra | 132 kg | 66 kg | 47 kg |
| Straight-Arm Pulldown (Lat Pushdown) | cabo | 57 kg (126 lb) | 26 kg (57 lb) | 17 kg (38 lb) |
| Face Pull | cabo | variante halter: homem 21 kg, mulher 12 kg | — | — |
| Inverted Row | reps (PC) | — | 13 reps (mulher Int) | — |

*Face pull e straight-arm pulldown são isoladores de alta repetição (12-20 reps); padrões de 1RM são ilustrativos.*

---

## 5. BRAÇOS E OMBROS (Bíceps, Tríceps, Deltoides)

*Fonte primária: Strength Level (2,55M roscas; 5,6M presses de ombro; 2,15M dips) e Fitness Volt. **A diferença entre sexos é a MAIOR do corpo no trem superior** (razão F/M ~0,53-0,60). **Atenção: halteres reportados PER DUMBBELL.***

### SEÇÃO A — BÍCEPS

#### 5.1 Barbell Curl (Rosca Direta com Barra) — âncora de bíceps

| Nível | M ratio | F ratio |
|---|---|---|
| Beginner | 0.20x | 0.10x |
| Novice | 0.40x | 0.20x |
| Intermediate | 0.60x | 0.40x |
| Advanced | 0.85x | 0.60x |
| Elite | 1.15x | 0.85x |

**MASCULINO — por PC (kg, 1RM):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 9 | 18 | 30 | 46 | 64 |
| 60 | 13 | 23 | 37 | 54 | 73 |
| 70 | 16 | 27 | 43 | 61 | 82 |
| 80 | 19 | 32 | 48 | 67 | 89 |
| 90 | 23 | 36 | 53 | 73 | 96 |
| 100 | 26 | 40 | 58 | 79 | 102 |
| 110 | 29 | 43 | 62 | 84 | 108 |
| 120 | 32 | 47 | 66 | 89 | 114 |

**FEMININO — por PC (kg, 1RM):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 5 | 11 | 20 | 32 | 47 |
| 60 | 6 | 13 | 23 | 36 | 51 |
| 70 | 8 | 15 | 26 | 40 | 56 |
| 80 | 9 | 17 | 29 | 43 | 59 |
| 90 | 10 | 19 | 31 | 46 | 63 |
| 100 | 12 | 21 | 33 | 49 | 66 |
| 110 | 13 | 23 | 35 | 51 | 69 |
| 120 | 14 | 24 | 37 | 53 | 71 |

#### 5.2 Demais exercícios de bíceps — padrões da comunidade (kg, 1RM)

| Exercício | Equip. | Por haltere? | Sexo | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|---|---|
| Dumbbell Curl | halter | Sim | M | 6 | 12 | 23 | 35 | 49 |
| Dumbbell Curl | halter | Sim | F | 3 | 6 | 14 | 22 | 33 |
| Hammer Curl | halter | Sim | M | 8 | — | 23 | — | — |
| Hammer Curl | halter | Sim | F | 4 | — | 13 | — | — |
| Preacher Curl | barra/EZ | Não | M | 17 | — | 46 | — | — |
| Preacher Curl | barra/EZ | Não | F | 7 | — | 26 | — | — |
| Incline DB Curl | halter | Sim | M | 6 | 12 | 19 | 29 | 40 |
| Incline DB Curl | halter | Sim | F | 3 | 7 | 13 | 20 | 28 |
| Concentration Curl | halter | Sim | M | 7 | 13 | 22 | 33 | 46 |
| Concentration Curl | halter | Sim | F | 4 | 8 | 13 | 21 | 29 |
| Cable Curl | cabo | Não | M | 13 | 29 | 51 | 81 | 115 |
| Cable Curl | cabo | Não | F | 6 | 14 | 27 | 44 | 64 |
| EZ Bar Curl | EZ | Não | M | ~17 | — | ~38 | — | — |
| EZ Bar Curl | EZ | Não | F | ~11 | — | 28 | — | — |
| Spider Curl | barra | Não | M | 6 | 16 | 33 | 55 | 82 |
| Spider Curl | barra | Não | F | 6 | 13 | 24 | 37 | 52 |

*Preacher Curl proporções modeladas (Fitness Volt): M Int ~0,58× / Adv ~0,81×; F Int ~0,39× / Adv ~0,61× / Elite ~0,85×.*

### SEÇÃO B — TRÍCEPS

#### 5.3 Close-Grip Bench Press

| Sexo | Beg | Int (média comunidade) |
|---|---|---|
| M | 47 | 93 |
| F | 20 | 49 |

Proporções modeladas (≈ supino × 0,93): M ~0,55 / 0,80 / 1,10 / 1,45 / 1,80×; F ~0,35 / 0,55 / 0,80 / 1,10 / 1,45×. Marcar `source='modeled'`.

#### 5.4 Demais exercícios de tríceps — padrões da comunidade (kg, 1RM)

| Exercício | Equip. | Por haltere? | Sexo | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|---|---|
| Triceps Pushdown (barra) | cabo | Não | M | 17 | — | 57 | — | — |
| Triceps Pushdown (barra) | cabo | Não | F | 8 | — | 31 | — | — |
| Triceps Rope Pushdown | cabo | Não | M | 15 | — | 47 | — | — |
| Triceps Rope Pushdown | cabo | Não | F | 8 | — | 26 | — | — |
| Skullcrusher / Lying Tricep Ext | barra/EZ | Não | M | 15 | — | ~40 | — | — |
| Lying Tricep Ext | barra | Não | F | 6 | — | 22 | — | — |
| Tricep Extension (barra, em pé) | barra | Não | M | 12 | — | 49 | — | — |
| Tricep Extension (barra) | barra | Não | F | 4 | — | 23 | — | — |
| Overhead DB Tricep Ext | halter | 2 mãos | M | 5 | — | 23 | — | — |
| Overhead DB Tricep Ext | halter | 2 mãos | F | 3 | — | 13 | — | — |
| Cable Overhead Tricep Ext | cabo | Não | M | 10 | 23 | 42 | 67 | 97 |
| Cable Overhead Tricep Ext | cabo | Não | F | 5 | 12 | 23 | 37 | 54 |
| Dumbbell Tricep Kickback | halter | Sim | M | 4 | — | 18 | — | — |
| Dumbbell Tricep Kickback | halter | Sim | F | 3 | — | 11 | — | — |

#### 5.5 Triceps Dips (paralelas) — REPS + added_weight_kg

**Reps (comunidade):** M Beg <1 / Nov 8 / Int 20 / Adv 34 / Elite 49; F Beg <1 / Nov <1 / Int 10 / Adv 22 / Elite 35. *(Mesmos dados de Chest Dips — seção 3.8; usar mesmo `exercise_id`.)*

**1RM com carga adicional (kg) — MASCULINO (por PC):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | -8 | +9 | +31 | +56 | +83 |
| 60 | -5 | +15 | +39 | +67 | +96 |
| 70 | -2 | +20 | +46 | +76 | +107 |
| 80 | 0 | +23 | +51 | +83 | +116 |
| 90 | +1 | +26 | +56 | +89 | +124 |
| 100 | +2 | +29 | +60 | +94 | +130 |
| 110 | +2 | +30 | +63 | +98 | +136 |
| 120 | +2 | +31 | +65 | +102 | +140 |

**1RM com carga adicional (kg) — FEMININO (por PC):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | -15 | -1 | +16 | +35 | +57 |
| 60 | -15 | 0 | +19 | +40 | +63 |
| 70 | -16 | +1 | +21 | +44 | +68 |
| 80 | -18 | 0 | +22 | +46 | +71 |
| 90 | -20 | -1 | +22 | +47 | +74 |
| 100 | -22 | -2 | +22 | +48 | +75 |
| 110 | -25 | -4 | +21 | +48 | +76 |
| 120 | -28 | -6 | +19 | +47 | +76 |

*Negativo = assistência. **Bench Dips** (banco) só em reps: M Nov 10 / Int 32 / Adv 60 / Elite 91; F Int 19 / Adv 38 / Elite 59.*

### SEÇÃO C — OMBROS (DELTOIDES)

#### 5.6 Overhead Press / Military Press — âncora de ombro

| Nível | M ratio | F ratio |
|---|---|---|
| Beginner | 0.35x | 0.20x |
| Novice | 0.55x | 0.35x |
| Intermediate | 0.80x | 0.50x |
| Advanced | 1.10x | 0.75x |
| Elite | 1.40x | 1.00x |

**MASCULINO — por PC (kg, 1RM):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 15 | 25 | 38 | 53 | 71 |
| 60 | 21 | 32 | 47 | 64 | 83 |
| 70 | 27 | 40 | 56 | 75 | 95 |
| 80 | 33 | 47 | 64 | 84 | 106 |
| 90 | 39 | 54 | 72 | 93 | 116 |
| 100 | 44 | 60 | 80 | 102 | 125 |
| 110 | 49 | 66 | 88 | 112 | 137 |
| 120 | 54 | 72 | 93 | 117 | 143 |

**FEMININO — por PC (kg, 1RM):**

| PC (kg) | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| 50 | 10 | 18 | 25 | 38 | 50 |
| 60 | 12 | 21 | 30 | 45 | 60 |
| 70 | 14 | 25 | 35 | 53 | 70 |
| 80 | 16 | 28 | 40 | 60 | 80 |
| 90 | 18 | 32 | 45 | 68 | 90 |
| 100 | 20 | 35 | 50 | 75 | 100 |
| 110 | 22 | 39 | 55 | 83 | 110 |
| 120 | 24 | 42 | 60 | 90 | 120 |

**Médias:** M 64 kg / 142 lb, F 34 kg / 75 lb (Strength Level). **Divergência de fonte:** StrengthLog reporta 57 kg M / 30 kg F (~10-12% menor) — registrar como `source` alternativo.

#### 5.7 Demais exercícios de ombro — padrões da comunidade (kg, 1RM)

| Exercício | Equip. | Por haltere? | Sexo | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|---|---|---|
| Seated DB Shoulder Press | halter | Sim | M | 13 | — | 31 | — | — |
| Seated DB Shoulder Press | halter | Sim | F | 6 | — | 16 | — | — |
| Arnold Press | halter | Sim | M | 8 | — | ~22 | — | — |
| Arnold Press | halter | Sim | F | 5 | — | 13 | — | — |
| DB Lateral Raise | halter | Sim | M | 4 | — | 15 | — | — |
| DB Lateral Raise | halter | Sim | F | 3 | — | 9 | — | — |
| Cable Lateral Raise | cabo | Não | M | 1 | — | 18 | — | — |
| Cable Lateral Raise | cabo | Não | F | 2 | — | 10 | — | — |
| Machine Lateral Raise | máquina | Não | M | 15 | — | 57 | — | — |
| Machine Lateral Raise | máquina | Não | F | 6 | — | 22 | — | — |
| DB Front Raise | halter | Sim | M | 3 | 9 | 18 | 30 | 44 |
| DB Front Raise | halter | Sim | F | 2 | 5 | 10 | 17 | 26 |
| DB Reverse Fly (rear delt) | halter | Sim | M | 2 | 8 | 18 | 32 | 48 |
| DB Reverse Fly | halter | Sim | F | 2 | 5 | 10 | 17 | 25 |
| Face Pull | cabo | Não | M | 12 | 26 | 46 | 71 | 101 |
| Face Pull | cabo | Não | F | 10 | 19 | 33 | 50 | 70 |
| Upright Row | barra | Não | M | 21 | — | 64 | — | — |
| Upright Row | barra | Não | F | 11 | — | 33 | — | — |
| Machine Shoulder Press | máquina | Não | M | 24 | 46 | 77 | 115 | 159 |
| Machine Shoulder Press | máquina | Não | F | 8 | 18 | 34 | 56 | 80 |
| Push Press | barra | Não | M | 37 | 57 | 83 | 114 | 147 |
| Push Press | barra | Não | F | 22 | 33 | 46 | 62 | 80 |
| Barbell Shrug | barra | Não | M | 46 | 82 | 131 | 191 | 258 |
| Barbell Shrug | barra | Não | F | 16 | 37 | 67 | 107 | 153 |

*Barbell Shrug aparece também na seção 4.12 (trapézio/costas) — mesmo `exercise_id`.*

---

## 6. PERNAS (Quadríceps, Hamstrings, Glúteos, Panturrilhas, Adutores/Abdutores)

*Fonte primária: Strength Level (squat 24.851.640 lifts; hip thrust 1.212.428) e Fitness Volt. **O gap de gênero é o MENOR do corpo nas pernas** (fem = 60-72% masc); em hip thrust as mulheres igualam/superam homens em razão por PC.*

### QUADRÍCEPS / PADRÃO DE AGACHAMENTO

#### 6.1 Back Squat (Agachamento Livre) — âncora primário do trem inferior

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 64 | 93 | 130 | 173 | 219 |
| Masc ratio | 0.75x | 1.25x | 1.50x | 2.25x | 2.75x |
| Fem (kg) | 30 | 48 | 73 | 103 | 136 |
| Fem ratio | 0.50x | 0.75x | 1.25x | 1.50x | 2.00x |

**Por peso corporal (Int / Adv / Elite, kg):**

| BW (kg) | Masc Int | Masc Adv | Masc Elite | Fem Int | Fem Adv | Fem Elite |
|---|---|---|---|---|---|---|
| 50 | 76 | 104 | 136 | 61 | 87 | 115 |
| 60 | 95 | 127 | 161 | 70 | 97 | 128 |
| 70 | 113 | 147 | 184 | 78 | 106 | 138 |
| 80 | 130 | 166 | 205 | 85 | 115 | 148 |
| 90 | 146 | 184 | 225 | 91 | 123 | 157 |
| 100 | 160 | 201 | 243 | 98 | 130 | 165 |
| 110 | 174 | 216 | 260 | 103 | 136 | 172 |
| 120 | 188 | 231 | 277 | 109 | 143 | 179 |

#### 6.2 Front Squat
Masculino: Beg 55 / Int 105 kg; feminino: Beg 30 / Int 62 kg. ~80-85% do back squat. Maior ativação de vasto medial e demanda de tronco ereto.

#### 6.3 Hack Squat (máquina) — base 558.738 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 54 | 98 | 157 | 231 | 315 |
| Masc ratio | 0.75x | 1.25x | 2.00x | 2.75x | 4.00x |
| Fem (kg) | 22 | 51 | 94 | 149 | 214 |
| Fem ratio | 0.25x | 0.75x | 1.50x | 2.25x | 3.25x |

**Barbell Hack Squat:** masculino Beg 50 / Int 126 kg; feminino Int 47 kg.

#### 6.4 Leg Press (atenção: ângulo/tipo muda muito os números)
- **Sled 45°** — base 2.639.834 lifts. Masc Int 226 kg (499 lb), Beg ~87 kg (191 lb); Fem Int 141 kg (310 lb), Beg ~41 kg. Peso do sled incluído.
- **Horizontal** — Masc Int ~193 kg (425 lb); Fem Int ~117 kg (258 lb), Beg 37 kg.
- **Single Leg** — Masc Int ~143 kg (314 lb); Fem Int ~80 kg (177 lb).

#### 6.5 Leg Extension (máquina) — base 1.142.846 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 35 | 61 | 96 | 139 | 186 |
| Masc ratio | 0.50x | 0.75x | 1.25x | 1.75x | 2.50x |
| Fem (kg) | 18 | 34 | 58 | 88 | 122 |
| Fem ratio | 0.25x | 0.50x | 1.00x | 1.25x | 2.00x |

#### 6.6 Bulgarian Split Squat
Barra: masc Beg 15 / Int 61 kg; fem Beg 9 / Int 34 kg.
**PER DUMBBELL:** masc Beg 10 / Int 30 kg; fem Beg 6 / Int 18 kg. (Também é exercício de glúteo de alta ativação.)

#### 6.7 Goblet Squat — PER DUMBBELL, base 383.376 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 13 | 26 | 42 | 63 | 87 |
| Masc ratio | 0.20x | 0.35x | 0.55x | 0.85x | 1.15x |
| Fem (kg) | 9 | 17 | 26 | 39 | 52 |
| Fem ratio | 0.15x | 0.25x | 0.40x | 0.60x | 0.85x |

#### 6.8 Lunges (Avanço/Afundo)
Barbell Lunge / Walking Lunge: feminino Int ~50 kg (110 lb), Beg ~19 kg (42 lb); masculino comparável a split squat com barra.

#### 6.9 Smith Machine Squat — base 274.645 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 48 | 79 | 120 | 170 | 225 |
| Masc ratio | 0.75x | 1.00x | 1.50x | 2.25x | 3.00x |
| Fem (kg) | 22 | 41 | 66 | 98 | 134 |
| Fem ratio | 0.25x | 0.75x | 1.00x | 1.50x | 2.25x |

#### 6.10 Box Squat — base 264.696 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 69 | 106 | 153 | 209 | 270 |
| Masc ratio | 0.75x | 1.25x | 1.75x | 2.50x | 3.25x |
| Fem (kg) | 38 | 59 | 87 | 120 | 156 |
| Fem ratio | 0.50x | 1.00x | 1.25x | 1.75x | 2.50x |

#### 6.11 Pistol Squat (peso corporal — REPS) — base 310.059 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (reps) | <1 | 2 | 13 | 28 | 44 |
| Fem (reps) | <1 | 1 | 10 | 22 | 34 |

### HAMSTRINGS / CADEIA POSTERIOR

#### 6.12 Romanian Deadlift (RDL) *(= seção 4.3; aqui como lift de hamstring)*
Masc Beg 55 / Int 120 kg; fem Beg 29 / Int 66 kg. ~65-75% do deadlift convencional. Ratios: masc Int ~1.25-1.5×, Adv ~1.6×; fem Int ~0.9-1.0×.
**Dumbbell RDL** — PER DUMBBELL: masc Beg 12 / Int 41 kg; fem Beg 9 / Int 26 kg.

#### 6.13 Stiff-Leg Deadlift
Semelhante ao RDL com pernas mais retas e ROM maior; melhor para força concêntrica do hamstring e salto vertical (CMJ).

#### 6.14 Seated Leg Curl (máquina) — base 454.809 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 29 | 50 | 79 | 114 | 154 |
| Masc ratio | 0.50x | 0.75x | 1.00x | 1.50x | 2.00x |
| Fem (kg) | 16 | 29 | 47 | 70 | 96 |
| Fem ratio | 0.25x | 0.45x | 0.75x | 1.05x | 1.45x |

#### 6.15 Lying Leg Curl (máquina)
Masc Beg 23 / Int ~38 kg; fem Beg 14 / Int 38 kg.

#### 6.16 Good Morning (barra) — base 205.497 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 24 | 50 | 87 | 134 | 189 |
| Masc ratio | 0.25x | 0.50x | 1.00x | 1.75x | 2.25x |
| Fem (kg) | 13 | 26 | 44 | 67 | 94 |
| Fem ratio | 0.20x | 0.40x | 0.70x | 1.05x | 1.45x |

#### 6.17 Nordic Hamstring Curl (peso corporal — REPS)
Masc média 11 reps, fem 15 reps (Intermediário). 1+ rep estrito com PC sem assistência de braços = força impressionante.

#### 6.18 Glute-Ham Raise (GHR)
Peso corporal, progressão para versão com peso no peito; maior overload que o nordic; ativa hamstring na fase concêntrica.

### GLÚTEOS

#### 6.19 Hip Thrust (barra) — âncora glúteo primário — base 1.212.428 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 38 | 76 | 129 | 196 | 273 |
| Masc ratio | 0.50x | 1.00x | 1.75x | 2.50x | 3.50x |
| Fem (kg) | 30 | 56 | 93 | 139 | 191 |
| Fem ratio | 0.50x | 1.00x | 1.50x | 2.25x | 3.00x |

**Por peso corporal (Int / Adv / Elite, kg):**

| BW (kg) | Masc Int | Masc Adv | Masc Elite | Fem Int | Fem Adv | Fem Elite |
|---|---|---|---|---|---|---|
| 50 | 73 | 120 | 176 | 84 | 127 | 177 |
| 60 | 96 | 149 | 211 | 92 | 137 | 188 |
| 70 | 118 | 176 | 242 | 98 | 145 | 198 |
| 80 | 138 | 201 | 271 | 104 | 152 | 206 |
| 90 | 158 | 224 | 298 | 110 | 159 | 214 |
| 100 | 176 | 246 | 324 | 115 | 165 | 220 |
| 120 | 211 | 286 | 370 | 124 | 175 | 233 |

> **Nota de gênero:** em BW baixos (50-60 kg) as mulheres têm Int/Elite absolutos **iguais ou maiores** que os homens — a convergência de gênero mais marcante de todos os exercícios de perna.

#### 6.20 Barbell Glute Bridge — base 131.760 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 32 | 67 | 118 | 182 | 257 |
| Masc ratio | 0.50x | 1.00x | 1.50x | 2.50x | 3.50x |
| Fem (kg) | 31 | 56 | 92 | 136 | 186 |
| Fem ratio | 0.50x | 1.00x | 1.50x | 2.25x | 3.00x |

**Glute Bridge (peso corporal — REPS):** masc Beg<1 / Nov 7 / Int 37 / Adv 78 / Elite 125; fem Beg<1 / Nov 8 / Int 31 / Adv 62 / Elite 97.

#### 6.21 Cable Pull-Through — base 127.846 lifts

| Gênero | Beg | Nov | Int | Adv | Elite |
|---|---|---|---|---|---|
| Masc (kg) | 13 | 32 | 60 | 97 | 140 |
| Masc ratio | 0.25x | 0.50x | 0.75x | 1.25x | 1.75x |
| Fem (kg) | 10 | 23 | 42 | 67 | 96 |
| Fem ratio | 0.25x | 0.25x | 0.75x | 1.00x | 1.50x |

#### 6.22 Glute Kickback (cabo — REPS) — base 85.753 lifts
Masc Beg<1 / Nov 6 / Int 31 / Adv 64 / Elite 102; fem Beg<1 / Nov 6 / Int 27 / Adv 56 / Elite 89.

#### 6.23 Step-Ups
Dados Strength Level não recuperados. Referência Contreras: 5+ step-ups à altura paralela com 0.8× BW (masc) / 0.6× BW (fem) = impressionante. FitnessVolt (modelado, dumbbell step-up): masc Int ~29 kg (0.36× BW) a 82 kg de BW.

### PANTURRILHAS (CALVES)

| Exercício | Masc Beg | Masc Int | Fem Beg | Fem Int |
|---|---|---|---|---|
| Machine Calf Raise (em pé) | 31 kg | 134 kg | 15 kg | 83 kg |
| Seated Calf Raise | 22 kg | 100 kg | 13 kg | 69 kg |
| Single Leg Seated Calf Raise | 15 kg | 62 kg | 7 kg | 38 kg |

*Machine Calf Raise base 348.923 lifts. Benchmark fisioterapia: alvo 1-1.5× BW no seated calf raise, elite 1.75-2× BW; endurance 25+ elevações unilaterais em pé. Leg Press Calf Raise: cargas comparáveis ao machine calf raise, variam por máquina.*

### ADUTORES / ABDUTORES

| Exercício | Masc Beg | Masc Int | Fem Beg | Fem Int |
|---|---|---|---|---|
| Hip Adduction (máquina) | 32 kg | 109 kg | 22 kg | 71 kg |
| Hip Abduction (máquina) | 30 kg | 101 kg | 23 kg | 74 kg |

*Mulheres têm ratio relativamente alto em abdução (74/101 = 73%), refletindo glúteo médio proporcionalmente forte.*

### Médias populacionais (pernas)
- **Squat:** homem treinado (Int) 130 kg / 287 lb (1.5× BW); mulher 73 kg / 161 lb (1.25× BW). Untrained masc ~0.75× BW; fem ~0.5× BW.
- **Leg press (sled):** homem Int 226 kg, mulher 141 kg.
- **Hip thrust:** homem Int 129 kg, mulher 93 kg.

---

## 7. Influência das variáveis — síntese transversal

### 7.1 Gênero

A força feminina **não é uma fração uniforme** da masculina — depende do grupo muscular. Síntese (Miller et al.; Nuzzo 2023, *J Strength Cond Res* 37(2):494-536, DOI 10.1519/JSC.0000000000004329; Laubach):

| Domínio | Força feminina como % da masculina | Implicação |
|---|---|---|
| Membro superior (braço/ombro) | **50-60%** (Laubach: 55,8%) | maior gap do corpo |
| Tronco | 63,8% | intermediário |
| Membro inferior (pernas) | **60-72%** (Laubach: 71,9%) | menor gap |
| Recorde mundial — squat | 66-77% | — |
| Recorde mundial — deadlift | 69-79% | — |
| Recorde mundial — bench | 61-71% | maior gap |

**Razões F/M derivadas dos dados (Intermediate por PC), por exercício:**
- Supino: ~0,60 · Deadlift: 0,625 · Sumô: 0,667 · Remada curvada: 0,65 · Puxada: 0,70 · Remada halter: 0,636 · Barra fixa (reps): 0,43
- Rosca direta: 0,53 · Press de ombro: 0,53 · Pushdown: 0,54 · Elevação lateral: 0,60
- Squat: ~0,56 · Hip thrust: ~0,72 · Leg extension: ~0,60 · Seated leg curl: ~0,59 · Hip abduction: ~0,73

**Regra prática para o app:** aplicar um **fator de gênero POR EXERCÍCIO** (não global). Em movimentos glúteo/quadril-dominantes (hip thrust, glute bridge, abdução), o gap quase desaparece — em BW baixos as mulheres igualam/superam os homens. Quando o treino é idêntico, mulheres ganham força/músculo na **mesma taxa relativa**; a diferença é de baseline, não de potencial. Causas: testosterona (homens 10-20× mais), maior área de secção transversa de fibras tipo II, e estrutura esquelética (escápula/úmero maiores no caso do ombro). **Armazenar os valores femininos explicitamente** (são datasets separados na fonte), não derivá-los de um multiplicador único.

### 7.2 Peso corporal (escala alométrica)

A força não cresce linearmente com o peso — a força máxima é proporcional à área de secção transversa do músculo, que escala com o peso corporal elevado a **~0,67** (lei alométrica). Por isso lifters mais pesados levantam mais em absoluto, mas têm **razão força/PC menor**. Exemplos: no deadlift masculino, homem de 60 kg ≈ 1.90× no Int vs homem de 120 kg ≈ 1.78×; no squat masculino, Elite vai de 2.72× BW (50 kg) a 2.31× BW (120 kg). **Sempre usar as tabelas por peso corporal** (não apenas a razão única) para precisão. Coeficientes de normalização (Wilks/DOTS/IPF GL) na seção 9.

### 7.3 Altura / Comprimento dos membros

O efeito da altura **inverte conforme o padrão de movimento** — é o ponto biomecânico mais importante do documento:

| Movimento | Efeito de braços/membros longos | Quem é favorecido |
|---|---|---|
| **Supino** | braços longos = ROM maior = desvantagem na carga | tronco espesso, antebraços curtos, baixo |
| **Overhead press** | braços longos = ROM maior = desvantagem (análogo ao supino) | mais baixo |
| **Deadlift/Sumô** | **braços longos + tronco curto = VANTAGEM** (quadris mais altos, torso mais vertical, ROM menor, menor braço de momento no quadril) | longilíneo de braço, tronco curto |
| **Squat** | **fêmur longo + tronco curto = DESVANTAGEM** (mais inclinação anterior, maior braço de momento no joelho, ROM maior) | tronco longo + fêmur curto, mais baixo |
| **Barra fixa/chin-up** | peso corporal baixo é vantagem; braços longos = ROM maior = mais difícil | leve, braços curtos |
| **Rosca/extensão** | antebraço longo = maior braço de momento da resistência = desvantagem; inserção tendínea distal = vantagem | varia por inserção individual |
| **Hip thrust / RDL** | proporções importam pouco (braço de momento de extensão de quadril consistente) | — |

Referências-chave: Lockie et al. (PMC9944492) — altura/massa magra ↑ força absoluta (r=0,66) mas ↓ resistência relativa (r≤−0,36); Hernandez et al. (PMC9785143) — momentos articulares isométricos explicam 43% da variância do supino; Howenstein/Brookbush — fêmur longo prejudica o squat; Barbell Physio — braços longos favorecem o terra. Mitigações no squat para fêmur longo: low-bar, salto/anilha sob o calcanhar, stance aberto, mobilidade de tornozelo.

### 7.4 Idade

Pico de força entre **25-40 anos**. Multiplicadores aproximados sobre o pico (Strength Level, válidos para ambos os sexos):

| Idade | Multiplicador | | Idade | Multiplicador |
|---|---|---|---|---|
| 20 | ~0.97 | | 60 | ~0.75 |
| 25-40 | 1.00 (pico) | | 65 | ~0.68 |
| 45 | ~0.95 | | 70 | ~0.61 |
| 50 | ~0.89 | | 80 | ~0.49 |
| 55 | ~0.82 | | | |

Exercícios dependentes de razão força/peso (barra fixa) declinam mais rápido: homem que faz 14 reps Int aos 30 cai para ~9 aos 50 e ~4 aos 60. Pernas retêm força razoavelmente, mas a **potência** declina mais rápido que a força máxima. Federações usam fatores McCulloch/Foster para normalizar masters (40+). **Modelar a idade como vetor de multiplicadores** aplicado sobre a tabela base, em vez de tabelas completas por idade.

---

## 8. Ativação muscular (EMG) — síntese transversal

*Valores em % da Contração Voluntária Máxima (%MVC/%MVIC). EMG mede ativação elétrica no instante medido, **não** prediz perfeitamente hipertrofia de longo prazo. Usar como guia de SELEÇÃO de exercícios, não como verdade absoluta de crescimento.*

### 8.1 Peito — por porção do peitoral
- **Plano (esternal/média):** maior ativação da porção esternal. López-Vivancos et al. (2023, *Applied Sciences* 13(8):5203): supino plano ativa a esternal significativamente mais que a versão inclinada (SMD=1,80; p=0,017).
- **Inclinado (clavicular/superior):** 30° ótimo para o peitoral superior; >45° transfere para o deltoide anterior.
- **Declinado (esternocostal/inferior):** maior ativação inferior, menor clavicular.
- **Pegada:** fechada ↑ clavicular; maior envolvimento do peitoral em **150-200% da distância biacromial**.
- **Flexão:** ativação comparável/superior ao supino em alguns estudos.

### 8.2 Costas — verticais (latíssimo) vs horizontais (trapézio médio/rombóides)
- **Latíssimo do dorso:** barra fixa/chin-up vencem. Youdas et al. (2010, *J Strength Cond Res* 24(12):3404): latíssimo 117-130% MVIC, bíceps 78-96%, infraespinhal 71-79%, trapézio inferior 45-56%. Edelburg 2017 (%MVC): pull-up 108, chin-up 105, bent-over row 91, seated row 90, lat pulldown 88, inverted row 83.
- **Trapézio médio/rombóides:** remadas vencem. Edelburg: inverted row 108, I-Y-T 108, bent-over row 107, seated row 99 (vs pull-up 80, lat pulldown 61).
- **Trapézio inferior/deltoide posterior:** I-Y-T raises maximizam (81% MVC trap inferior; Ekstrom 2003: "Y" 97% trap inferior, "T" 101% trap médio).
- **Eretores da espinha:** bent-over row é o maior ativador entre exercícios de costas (66% MVC).
- **Pegada:** pronada ↑ latíssimo vs supinada (Lusk 2010), independente da largura; **largura quase não muda o latíssimo** (Andersen 2014) — 6RM até maiores com pegada estreita/média.
- **Deadlift conv. vs sumô:** eretores NÃO diferem significativamente (Escamilla 2002); sumô ativa mais quadríceps; convencional mais gastrocnêmio medial.

### 8.3 Braços e ombros — por cabeça muscular
**Bíceps** (cabeça longa = pico; curta = largura; brachialis = espessura; brachioradialis):
- EZ bar curl > dumbbell curl em ativação do bíceps e brachioradialis (Marcolin 2018).
- Incline curl alonga a cabeça longa e mantém ativação por toda a ADM; preacher enfatiza a cabeça curta em ADM curta (Oliveira 2009).
- Preacher → hipertrofia distal (brachialis); incline → hipertrofia proximal (cabeça longa) (Kassiano 2025).
- Hammer/reverse curl → brachialis/brachioradialis.

**Tríceps** (cabeça longa biarticular; lateral; medial):
- Extensões overhead crescem a cabeça longa **~1,5×** mais que pushdowns (Maeo 2023, *Eur J Sport Sci* 23:1240, DOI 10.1080/17461391.2022.2100279): cabeça longa +28,5% vs +19,6%; crescimento total ~40% maior — porque a cabeça longa é treinada alongada na posição overhead.

**Deltoides** (anterior/medial/posterior + supraespinhal) — Campos et al. 2020 (*J Hum Kinet* 75; PMC7706677; n=13, 60% 1RM):
- Anterior: shoulder press 33,3% (maior) > supino 21,4% > elevação lateral 21,2%.
- Medial: elevação lateral 30,3% e shoulder press 27,9%.
- Posterior: elevação lateral/reverse fly 24% (maior); reverse fly com pegada neutra ↑ posterior + infraespinhal (Schoenfeld 2013).

### 8.4 Pernas — quadríceps, hamstrings, glúteos, panturrilhas
- **Quadríceps:** front squat ↑ vasto medial vs back squat (Yavuz 2015; d=0,62 apesar de carga menor). Front/hack squat → maior reto femoral/VL/VM. Leg press: pés baixos ↑ quadríceps, pés altos ↑ glúteo/hamstring.
- **Hamstrings:** **seated leg curl > lying** para crescimento — Maeo et al. 2021 (*Med Sci Sports Exerc* 53(4):825, DOI 10.1249/MSS.0000000000002523): +14% (seated) vs +9% (prone), ~50% mais crescimento, porque a posição sentada alonga mais os hamstrings biarticulares. Nordic ↑ comprimento de fascículo do bíceps femoral, reduz lesão ~50-70%.
- **Glúteos:** **hip thrust >> squat** em ativação de glúteo máximo — Contreras et al. 2015 (*J Applied Biomechanics* 31(6):452; n=13 mulheres): glúteo máximo inferior 86,8% vs 45,4% MVC (peak 216% vs 130%); **sem diferença no vasto lateral**. Mas hipertrofia glútea em 12 semanas foi **similar** entre hip thrust e squat (Plotkin/Contreras 2023) — o squat foi superior para quadríceps/adutores. Abdução e trabalho unilateral maximizam o glúteo médio.
- **Panturrilhas:** em pé (joelho reto) → gastrocnêmio; sentado (joelho fletido) → isola o sóleo por insuficiência ativa do gastrocnêmio biarticular. Kinoshita/Maeo 2023 (*Front Physiol* 14:1272106, DOI 10.3389/fphys.2023.1272106): em pé vs sentado — gastrocnêmio lateral +12,4% vs +1,7%, medial +9,2% vs +0,6%; sóleo cresceu igual (+2,1% vs +2,9%).

---

## 9. Escala alométrica (Wilks, DOTS, IPF GL)

Sistemas para normalizar força entre pesos corporais e gêneros — essenciais para comparar usuários no app:

- **Wilks** (R. Wilks, 1994; revisado 2020 / Wilks 2.0): polinômio de 5º grau com constantes por sexo. Padrão histórico; melhor ajuste 70-100 kg.
- **DOTS:** polinômio de 4º grau (subconjunto open-source do Wilks). Melhor nos extremos de peso — CV ~2,3% vs Wilks 3,2%; correlação de Spearman média −0,89.
- **IPF GL (GoodLift):** modelo de decaimento exponencial `IPF GL = Total × 100/(A − B·e^(−C·PC))`, com constantes por sexo/equipamento/prova. Oficial da IPF; menor variabilidade entre classes (CV ~2,1%).
- **Modelo alométrico de referência:** `f(w) = θ₀ − θ₁·w^(−θ₂)` (Vanderburgh & Batterham; Nuckols).

**Lifts de competição** (squat, bench, deadlift) têm a melhor calibração de padrões. Hip thrust, leg press, overhead press (exceto histórico olímpico/strongman) e isoladores têm padrões **modelados** (ratio-derived), não percentis diretos de competição. Para o app: **armazenar o 1RM bruto + razão de PC** e calcular Wilks/DOTS/IPF GL on-the-fly cobre força absoluta E relativa.

---

## 10. Schema de banco de dados unificado

Schema consistente para os quatro grupos musculares. Três tabelas principais + três auxiliares.

### Tabela `exercise_standards` (exercícios com carga externa)
```sql
CREATE TABLE exercise_standards (
  exercise_id        INTEGER,
  exercise_name_pt   TEXT,      -- "Supino Reto", "Levantamento Terra", "Agachamento Livre"
  exercise_name_en   TEXT,      -- "Barbell Bench Press", "Deadlift", "Back Squat"
  gender             TEXT,      -- 'male' | 'female'
  bodyweight_kg      INTEGER,   -- 50,60,70,80,90,100,110,120
  level              TEXT,      -- 'beginner'|'novice'|'intermediate'|'advanced'|'elite'
  one_rm_kg          REAL,
  one_rm_lbs         REAL,
  bodyweight_ratio   REAL,
  per_dumbbell       BOOLEAN,   -- TRUE = valor por UM halter (inclui ~2kg da barra)
  equipment          TEXT,      -- 'barbell'|'dumbbell'|'cable'|'machine'|'ezbar'|'smith'
  muscle_group       TEXT,      -- 'chest'|'back'|'biceps'|'triceps'|'shoulders'
                                --  |'quadriceps'|'hamstrings'|'glutes'|'calves'|'adductors'
  source             TEXT       -- 'strengthlevel'|'exrx'|'fitnessvolt'|'strengthlog'|'modeled'
);
```

### Tabela `bodyweight_rep_standards` (exercícios de peso corporal)
Para dips, push-ups, pull-ups, chin-ups, inverted row, pistol squat, nordic curl, glute bridge, glute kickback, bench dips, etc.
```sql
CREATE TABLE bodyweight_rep_standards (
  exercise_id        INTEGER,
  exercise_name_pt   TEXT,
  exercise_name_en   TEXT,
  gender             TEXT,
  bodyweight_kg      INTEGER,   -- NULL quando a métrica é só reps independente de PC
  level              TEXT,
  metric_type        TEXT,      -- 'reps' | 'added_weight_kg'
  metric_value       REAL,      -- reps (inteiro) OU kg adicionados (negativo = assistência)
  metric_value_lbs   REAL,      -- só quando metric_type='added_weight_kg'
  equipment          TEXT,
  muscle_group       TEXT,
  source             TEXT
);
```

### Tabela `emg_activation` (ativação muscular por cabeça)
```sql
CREATE TABLE emg_activation (
  exercise_id        INTEGER,
  muscle_head        TEXT,      -- ver enum abaixo
  mvic_percent_mean  REAL,
  mvic_percent_peak  REAL,      -- NULL se não reportado
  study_ref          TEXT,      -- "Contreras et al. 2015"
  study_doi          TEXT,      -- DOI quando disponível
  year               INTEGER
);
-- muscle_head enum:
-- Peito: pec_clavicular, pec_sternal, pec_inferior
-- Costas: latissimus_dorsi, trapezius_upper, trapezius_middle, trapezius_lower,
--         rhomboids, erector_spinae, teres_major, infraspinatus
-- Braço: biceps_long_head, biceps_short_head, brachialis, brachioradialis,
--        triceps_long_head, triceps_lateral_head, triceps_medial_head
-- Ombro: anterior_deltoid, lateral_deltoid, posterior_deltoid, supraspinatus
-- Perna: rectus_femoris, vastus_lateralis, vastus_medialis, vastus_intermedius,
--        biceps_femoris, semitendinosus, semimembranosus,
--        gluteus_maximus, gluteus_medius, gluteus_minimus, gastrocnemius, soleus
```

### Tabelas auxiliares sugeridas
```sql
-- Fator de gênero POR EXERCÍCIO (razão feminino/masculino do Intermediate)
CREATE TABLE gender_factor (exercise_id INTEGER, ratio_female_to_male REAL);

-- Coeficiente etário (multiplicador sobre o pico 25-40 anos)
CREATE TABLE age_coefficient (age INTEGER, multiplier REAL);

-- Coeficientes de normalização alométrica (Wilks/DOTS/IPF GL)
CREATE TABLE allometric_coefficient (system TEXT, gender TEXT, coeff_name TEXT, value REAL);
```

### Notas de integridade referencial
- **RDL** aparece em Costas (4.3) e Pernas (6.12) → **mesmo `exercise_id`**, `muscle_group` primário = 'hamstrings'.
- **Chest Dips (3.8) e Triceps Dips (5.5)** compartilham as tabelas de reps → mesmo `exercise_id` para reps; o componente de carga adicional difere ligeiramente (peito mais inclinado vs tríceps mais ereto) e pode ter linhas próprias.
- **Barbell Shrug** aparece em Costas (4.12) e Ombros (5.7) → mesmo `exercise_id`.
- **Bulgarian Split Squat** é quadríceps + glúteo → registrar `muscle_group='quadriceps'` com tag secundária de glúteo se o app suportar múltiplos grupos.

---

## 11. Recomendações de implementação

**Estágio 1 — modelagem e carga inicial (MVP):**
1. Criar as três tabelas principais. Popular primeiro os **exercícios âncora** (têm dados completos Beg→Elite por PC): supino, deadlift, agachamento, hip thrust, overhead press, rosca direta, barra fixa, dips.
2. Marcar `per_dumbbell=true` em TODOS os halteres unilaterais (o valor é por UM halter, incluindo ~2 kg).
3. Exercícios de peso corporal vão em `bodyweight_rep_standards` com `metric_type` = `reps` ou `added_weight_kg` (negativo = assistência).

**Estágio 2 — lógica de cálculo:**
4. **Interpolação linear** entre pesos corporais tabelados (passo de ~5-10 kg) para qualquer peso de entrada.
5. Conversão kg→lbs com fator 2,20462; arredondar para 1,25 kg / 2,5 lb (incrementos reais de placas).
6. **Ajustes de idade** como curva de multiplicadores por sexo (pico 1,00 em 25-40 anos) aplicada sobre a tabela base.
7. **Fator de gênero POR EXERCÍCIO** (tabela `gender_factor`), nunca um multiplicador global.

**Estágio 3 — interpretação para o usuário:**
8. Classificar o usuário pelo percentil do nível atingido; sempre mostrar a próxima meta (coluna à direita).
9. Para exercícios de competição (squat/bench/deadlift), calcular **Wilks/DOTS/IPF GL** on-the-fly para comparação justa entre pesos/sexos.
10. **Camada EMG** para recomendar seleção de exercícios (ex.: "largura do dorsal → puxada/barra; espessura/trapézio → remadas; cabeça longa do tríceps → extensão overhead; sóleo → panturrilha sentada; glúteo → hip thrust").

**Benchmarks que mudam a recomendação:**
- Acima da razão Elite (ex.: supino >2,0× / squat >2,75× / deadlift >3,0× masc) → sinalizar "acima da faixa comunitária" e sugerir verificação de forma/ROM.
- Abaixo de Beginner → destreinado; priorizar técnica e progressão linear.
- 10+ barras fixas limpas → trocar progressão por reps por **barra fixa com carga** (`added_weight_kg`).
- Razão puxar/empurrar (remada/supino) < ~0,6-0,7 → priorizar volume de costas (15-22 séries/semana).
- Para máquinas (chest press, leg press, pec deck, hack squat) → avisar que comparação absoluta entre academias é pouco confiável; usar **progressão pessoal**.

---

## 12. Caveats globais

- **Dados auto-reportados (Strength Level, Symmetric Strength, StrengthLog):** refletem pessoas que treinam, não a população geral. "Intermediate" = mediana **dos usuários**, situando-se acima do adulto médio real (NHANES/Bohannon mostram a população geral abaixo do "untrained" online). Valores são dinâmicos e foram capturados em 2026.
- **1RM frequentemente estimado**, não medido sob juiz (fórmula de Epley a partir de séries). Remadas, puxadas e isoladores raramente são testados em 1RM real.
- **Forma/ROM inflam números:** remada curvada, T-bar, roscas e elevações são facilmente "trapaceadas" (impulso de quadril/tronco, ROM parcial). Os padrões assumem execução estrita.
- **Máquinas não são comparáveis entre fabricantes:** chest press, machine row, leg press, hack squat, pec deck, calf raise variam por alavanca/polia/ângulo/peso do sled. Armazenar a fonte/máquina; a carga na pilha ≠ resistência real.
- **Fitness Volt modela acessórios** (ratio-derived de OpenPowerlifting) — tratar como estimativas, marcar `source='modeled'`.
- **EMG ≠ hipertrofia:** maior %MVC indica ativação no instante medido, não necessariamente mais crescimento (ver hip thrust vs squat: EMG glúteo muito maior no thrust, mas hipertrofia similar em 12 semanas). Estudos de mestrado (Edelburg) têm n menor que os peer-reviewed (Youdas, Escamilla, Contreras, Maeo).
- **Conflitos sinalizados:** (a) eretores no deadlift conv. vs sumô — confiar em Escamilla (sem diferença), não na alegação secundária de "o dobro"; (b) overhead press — Strength Level (64/34 kg) vs StrengthLog (57/30 kg), ~10-12% de diferença.
- **Variação individual:** alavancas (comprimento de braço/fêmur/tronco), inserções tendíneas e histórico atlético podem deslocar um indivíduo em 1 nível inteiro. Tratar os padrões como **metas de progresso pessoal**, não veredito absoluto.
- **Dados raramente incluem atletas não-binários/trans;** as tabelas existentes só têm categorias masculina e feminina.
- **Ratios "Elite" feminino no hip thrust em BW baixos podem ultrapassar os masculinos** — não é erro, é a convergência de gênero real desse padrão.

---

*Fim do documento. Quatro relatórios consolidados sem perda de dados: Peito · Costas · Braços/Ombros · Pernas. ~13 exercícios de peito, ~12 de costas, ~30 de braço/ombro, ~25 de perna, com tabelas por sexo/peso/nível, EMG, biomecânica e schema de banco pronto para o Claude Code.*
