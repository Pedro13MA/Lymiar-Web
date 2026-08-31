## Summary

PDP e cart consomem `consumerDecision` da API (veredicto canónico). `computeProductInsights` mantido só como fallback offline. Tipos `readModel` pdp-v1.

## O que mudou

- `consumer-decision.ts` — BUY|WAIT|UNKNOWN da API
- ProductPageP34 / ProductInsightsSection — veredicto Hub primeiro
- `api.ts` + `types.ts` — `consumerDecision`, `readModel`
- Similar alternatives — peers cross-brand no mesmo leaf
- Testes alinhados (auth providers, search-p33)

## O que NÃO mudou

- Lógica de negócio local como fonte primária (fallback apenas)
- Cálculo de veredicto no browser

## Testes

- `npm test` — 186/186 PASS
- `npm run build` — OK
- Deploy VPS frontend `20260831-1032`

## Critérios de review

- [ ] `NIVEL_10.md` (Web mirror)
- [ ] `QUALITY_BAR.md`
- Gate Hub: `release_gate/2026-08-31/` no repo Lymiar-Hub

## Rollback frontend

`bash /opt/lymiar/backend/scripts/deploy_frontend.sh rollback 20260807-1541`

## Test plan

- [ ] `npm test` + `npm run build`
- [ ] PDP shows consumerDecision badge before stores
- [ ] `computeProductInsights` not primary when API payload present
- [ ] Reviewer sign-off before merge
