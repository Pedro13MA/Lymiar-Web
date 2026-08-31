# NIVEL_10 — Lymiar à prova de…

Espelho canónico — fonte: `Lymiar-Hub/docs/NIVEL_10.md`

| Campo | Valor |
|-------|--------|
| **Status** | Norma operacional (pós-consolidação arquitetura) |
| **Complementa** | `NON_NEGOTIABLES`, `CONSUMER_DECISION`, `ENGINE_ARCHITECTURE`, `EVALUATION_LOOP`, `QUALITY_BAR` |

# Objetivo

Definir o que significa o Lymiar ser **nível 10**: **à prova** de classes de falha conhecidas — com verificação automática ou humana.

# Princípio central

**Autodidata ≠ autodestrutivo.** O sistema **se corrige de forma controlada**; não se altera sozinho.

```text
Produção → observar → detectar → proposta → shadow → golden → humano → promote → medir → rollback
```

## As 7 provas

1. **Dados errados** — não inventar histórico; observado ≠ elegível; UNKNOWN normal
2. **Decisões contraditórias** — um dono BUY|WAIT|UNKNOWN; Web só lê API
3. **Alterações destrutivas** — shadow → humano → promote; sem mass cutover
4. **Regressões** — unit + integration + golden + release gate + smoke VPS
5. **Si próprio** — pode propor; não pode auto-promover
6. **Crescimento** — read models; Web sem motores; SQLite até trigger
7. **Dinheiro (P0)** — CD cego a comissão/EPC; Publish nunca escreve BUY

Ver documento completo no Hub: `docs/NIVEL_10.md`.
