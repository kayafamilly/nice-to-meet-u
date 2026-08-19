# Revue — attribution marketing par média — 2026-08-20

## Résultat

- Le navigateur continue de parler uniquement au BFF Next.js ; aucune collection PocketBase n’est exposée.
- Le cookie visiteur reste `HttpOnly` et seul son HMAC anonyme est transmis à la route métier d’inscription.
- La conversion est créée dans la même transaction PocketBase que le compte et son profil.
- La collection `analytics_conversions` est privée et ne contient ni e-mail ni adresse IP.
- Le rapport agrège visites, pages vues et inscriptions par média ; les comptes historiques sans attribution sont signalés `Non attribué`.
- L’export CSV reprend les performances par média.

## Vérifications exécutées

- `node --check services/pocketbase/pb_hooks/main.pb.js` — réussi.
- `node --check services/pocketbase/pb_migrations/1710000017_ntmy_analytics_conversions.js` — réussi.
- `pnpm audit --audit-level high` — aucune vulnérabilité connue.
- `pnpm check` — lint, types et 37 tests réussis.
- `pnpm build` — build Next.js de production réussi.
- Test PocketBase isolé sur le VPS — migrations `1710000000` à `1710000017` réussies.
- Test d’attribution isolé — une visite Instagram produit 1 visite, 1 page vue et 1 inscription dans la ligne Instagram.
- Contrôle d’accès isolé — la collection `analytics_conversions` répond `403` sans authentification superuser.

## Limite connue

L’attribution des inscriptions commence au déploiement de cette version. Les inscriptions plus anciennes ne peuvent pas être reconstituées de façon fiable et restent volontairement classées `Non attribué`.
