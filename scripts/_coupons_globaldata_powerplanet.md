# Cupões Globaldata / Powerplanet

Estado (2026-10-06):
- Merchants enabled no Hub (AWIN MID 28815 / 82531).
- Tabela `promotions`: 0 activas para estes slugs.
- API `/coupons?store=globaldata|powerplanet` e `/promotions/...` devolvem vazio.

Conclusão: não é bug de FE. A AWIN My Offers não tem campanhas joined+active
para estas contas/regiões neste momento. Quando a AWIN publicar ofertas, o
`AwinCouponSyncWorker` no Hub passa a popular e a homepage/PDP mostram os cards.

Acção operacional: no AWIN Advertiser Master, confirmar membership=joined e
promoções activas PT/ES para Globaldata e Powerplanet.
