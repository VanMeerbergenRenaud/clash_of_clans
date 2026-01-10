# Configuration Cloudflare Worker

## Étapes à suivre :

### 1. Créer le Worker (5 minutes)
1. Allez sur https://workers.cloudflare.com
2. Créez un compte gratuit (si vous n'en avez pas)
3. Cliquez sur "Create a Service"
4. Nommez-le "coc-api-proxy" (ou autre)
5. Cliquez sur "Quick Edit"
6. Supprimez le code par défaut et collez le contenu de `cloudflare-worker.js`
7. Cliquez sur "Save and Deploy"

### 2. Configurer la variable d'environnement
1. Dans le dashboard du worker, allez dans "Settings" → "Variables"
2. Ajoutez une variable d'environnement :
   - Nom : `COC_API_TOKEN`
   - Valeur : Votre clé API Clash of Clans
   - ✅ Cochez "Encrypt"
3. Cliquez sur "Save"

### 3. Obtenir l'IP du Worker
Cloudflare Workers utilisent un réseau CDN, donc pas d'IP fixe unique.
**Solution** : Créez votre clé API CoC avec `0.0.0.0/0` (accepte toutes les IPs)

Étapes :
1. Allez sur https://developer.clashofclans.com
2. Créez une nouvelle clé
3. Nom : "Production Worker"
4. Description : "Cloudflare Worker Proxy"
5. **IP** : `0.0.0.0/0` (important !)
6. Copiez la clé générée

### 4. Tester le Worker
Votre URL worker sera : `https://coc-api-proxy.VOTRE-COMPTE.workers.dev`

Testez avec :
```bash
curl https://coc-api-proxy.VOTRE-COMPTE.workers.dev/api/clans/%23L2Y8CUP
```

### 5. Mettre à jour votre app Nuxt

Dans votre fichier `.env` (pour production sur Vercel) :
```
NUXT_PUBLIC_COC_PROXY_URL=https://coc-api-proxy.VOTRE-COMPTE.workers.dev
```

Puis modifiez vos appels API dans l'app pour utiliser cette URL.

---

## Limites du plan gratuit
- 100,000 requêtes par jour (largement suffisant)
- Latence : ~50-100ms
- Uptime : 99.9%

## Alternative si problème avec 0.0.0.0/0
Si l'API CoC refuse `0.0.0.0/0`, vous pouvez :
1. Utiliser un VPS gratuit Oracle Cloud (avec IP fixe)
2. Ou créer plusieurs clés avec les ranges IP de Cloudflare :
   https://www.cloudflare.com/ips/
