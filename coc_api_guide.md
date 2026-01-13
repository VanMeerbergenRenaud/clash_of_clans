# Guide Complet de l'API Clash of Clans

## 📋 Table des matières
1. [Introduction](#introduction)
2. [Authentification](#authentification)
3. [Points de terminaison (Endpoints)](#endpoints)
4. [Exemples de code](#exemples)
5. [Bonnes pratiques](#bonnes-pratiques)
6. [Gestion des erreurs](#erreurs)
7. [Limites et restrictions](#limites)

---

## 🎮 Introduction

L'API Clash of Clans permet d'accéder aux données du jeu en temps réel, notamment :
- Informations sur les clans et joueurs
- Classements mondiaux et locaux
- Guerres de clans et ligues de guerre
- Statistiques du Capital de Clan
- Informations sur les ligues et saisons

**URL de base :** `https://api.clashofclans.com/v1`

**Documentation officielle :** https://developer.clashofclans.com

---

## 🔐 Authentification

### Obtenir une clé API

1. Créez un compte sur https://developer.clashofclans.com
2. Accédez à "My Account" pour générer une clé
3. Spécifiez votre adresse IP (obligatoire)
4. Donnez un nom à votre clé

### Utiliser la clé API

L'authentification utilise des **JSON Web Tokens (JWT)**. Chaque requête doit inclure :

```http
Authorization: Bearer VOTRE_CLE_API
```

**Important :** Ne partagez jamais votre clé API publiquement !

### Exemple de configuration

```javascript
const headers = {
  'Authorization': 'Bearer VOTRE_CLE_API',
  'Accept': 'application/json'
};
```

---

## 📡 Points de terminaison (Endpoints)

### 1. **CLANS** - Informations sur les clans

#### Rechercher des clans
```http
GET /clans
```

**Paramètres de recherche :**
- `name` : Nom du clan (minimum 3 caractères)
- `warFrequency` : Fréquence de guerre (always, moreThanOncePerWeek, oncePerWeek, lessThanOncePerWeek, never, unknown)
- `locationId` : ID de localisation
- `minMembers` : Nombre minimum de membres
- `maxMembers` : Nombre maximum de membres
- `minClanPoints` : Points minimums du clan
- `minClanLevel` : Niveau minimum du clan
- `limit` : Nombre de résultats (défaut: 20)
- `after` : Pagination (cursor)
- `before` : Pagination (cursor)
- `labelIds` : IDs des étiquettes

**Exemple :**
```javascript
fetch('https://api.clashofclans.com/v1/clans?name=warriors&minMembers=25&warFrequency=always&limit=10', {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
})
```

#### Informations d'un clan spécifique
```http
GET /clans/{clanTag}
```

**Note :** Le tag doit être encodé en URL. Le `#` devient `%23`.

**Exemple :** Pour le clan `#2PP`, utilisez `%232PP`

```javascript
const clanTag = encodeURIComponent('#2PP');
fetch(`https://api.clashofclans.com/v1/clans/${clanTag}`, {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
})
```

#### Liste des membres d'un clan
```http
GET /clans/{clanTag}/members
```

**Données retournées :**
- Tag du joueur
- Nom
- Rôle (leader, coLeader, admin, member)
- Niveau d'expérience
- Ligue
- Trophées
- Donations données/reçues
- Classement dans le clan

#### Guerre actuelle
```http
GET /clans/{clanTag}/currentwar
```

**Informations disponibles :**
- État de la guerre (preparation, inWar, warEnded)
- Taille de la guerre
- Équipe adverse
- Attaques des membres
- Cartes de guerre

#### Journal de guerre
```http
GET /clans/{clanTag}/warlog
```

**Note :** Le journal doit être public dans les paramètres du clan.

#### Ligue de guerre de clan (CWL)
```http
GET /clans/{clanTag}/currentwar/leaguegroup
```

**Informations :**
- État de la ligue
- Saison
- Clans participants
- Rounds programmés

```http
GET /clanwarleagues/wars/{warTag}
```

Détails d'une guerre spécifique dans une ligue.

#### Saisons du Capital de Clan
```http
GET /clans/{clanTag}/capitalraidseasons
```

**Paramètres :**
- `limit` : Nombre de saisons à récupérer

**Données :**
- Ressources pillées
- Attaques offensives
- Défenses
- Membres participants

---

### 2. **PLAYERS** - Informations sur les joueurs

#### Informations d'un joueur
```http
GET /players/{playerTag}
```

**Données complètes :**
- Niveau d'expérience
- Trophées (normal et versus)
- Niveau de l'hôtel de ville
- Clan actuel
- Statistiques de guerre
- Troupes et sorts (niveaux)
- Héros
- Réalisations (achievements)
- Historique des ligues

**Exemple :**
```javascript
const playerTag = encodeURIComponent('#8L9L9GL00');
fetch(`https://api.clashofclans.com/v1/players/${playerTag}`, {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
})
.then(res => res.json())
.then(data => console.log(data));
```

#### Vérifier un jeton API de joueur
```http
POST /players/{playerTag}/verifytoken

Body: {
  "token": "string"
}
```

---

### 3. **LEAGUES** - Informations sur les ligues

#### Liste des ligues
```http
GET /leagues
```

#### Détails d'une ligue
```http
GET /leagues/{leagueId}
```

#### Liste des saisons
```http
GET /leagues/{leagueId}/seasons
```

#### Classement d'une saison
```http
GET /leagues/{leagueId}/seasons/{seasonId}
```

**Exemple :**
```javascript
// Récupérer le classement Legend League de la saison 2024-01
fetch('https://api.clashofclans.com/v1/leagues/29000022/seasons/2024-01', {
  headers: { 'Authorization': 'Bearer VOTRE_CLE_API' }
})
```

#### Ligues War League
```http
GET /warleagues
```

```http
GET /warleagues/{leagueId}
```

#### Ligues Capital
```http
GET /capitalleagues
```

```http
GET /capitalleagues/{leagueId}
```

#### Ligues Builder Base
```http
GET /builderbaseleagues
```

```http
GET /builderbaseleagues/{leagueId}
```

---

### 4. **LOCATIONS** - Classements géographiques

#### Liste des localisations
```http
GET /locations
```

#### Détails d'une localisation
```http
GET /locations/{locationId}
```

#### Classement des clans
```http
GET /locations/{locationId}/rankings/clans
```

**Paramètres :**
- `limit` : Nombre de résultats (max 200)

#### Classement des joueurs
```http
GET /locations/{locationId}/rankings/players
```

#### Classement Builder Base (clans)
```http
GET /locations/{locationId}/rankings/clans-builder-base
```

#### Classement Builder Base (joueurs)
```http
GET /locations/{locationId}/rankings/players-builder-base
```

#### Classement Capital de Clan
```http
GET /locations/{locationId}/rankings/capitals
```

**Astuce :** Utilisez `locationId: global` pour les classements mondiaux.

---

### 5. **GOLDPASS** - Pass Or

#### Saison actuelle du Pass Or
```http
GET /goldpass/seasons/current
```

**Informations :**
- Date de début et de fin
- Disponibilité

---

### 6. **LABELS** - Étiquettes

#### Étiquettes de clan
```http
GET /labels/clans
```

#### Étiquettes de joueur
```http
GET /labels/players
```

Les étiquettes peuvent être utilisées pour filtrer les recherches de clans.

---

## 💻 Exemples de code

### JavaScript/Node.js avec fetch

```javascript
const axios = require('axios');

const API_KEY = 'votre_cle_api';
const BASE_URL = 'https://api.clashofclans.com/v1';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Accept': 'application/json'
};

// Récupérer les infos d'un clan
async function getClan(clanTag) {
  try {
    const encodedTag = encodeURIComponent(clanTag);
    const response = await axios.get(
      `${BASE_URL}/clans/${encodedTag}`,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
    throw error;
  }
}

// Rechercher des clans
async function searchClans(name, minMembers = 25) {
  try {
    const response = await axios.get(
      `${BASE_URL}/clans`,
      {
        headers,
        params: {
          name: name,
          minMembers: minMembers,
          limit: 20
        }
      }
    );
    return response.data.items;
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
    throw error;
  }
}

// Utilisation
getClan('#2PP').then(clan => {
  console.log(`Clan: ${clan.name}`);
  console.log(`Niveau: ${clan.clanLevel}`);
  console.log(`Membres: ${clan.members}`);
});
```

### Python

```python
import requests
from urllib.parse import quote

API_KEY = 'votre_cle_api'
BASE_URL = 'https://api.clashofclans.com/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Accept': 'application/json'
}

def get_clan(clan_tag):
    """Récupère les informations d'un clan"""
    encoded_tag = quote(clan_tag)
    url = f'{BASE_URL}/clans/{encoded_tag}'
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Erreur: {e}')
        return None

def get_player(player_tag):
    """Récupère les informations d'un joueur"""
    encoded_tag = quote(player_tag)
    url = f'{BASE_URL}/players/{encoded_tag}'
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'Erreur: {e}')
        return None

def search_clans(name, min_members=25, war_frequency='always'):
    """Recherche des clans"""
    url = f'{BASE_URL}/clans'
    params = {
        'name': name,
        'minMembers': min_members,
        'warFrequency': war_frequency,
        'limit': 20
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()['items']
    except requests.exceptions.RequestException as e:
        print(f'Erreur: {e}')
        return []

# Utilisation
clan = get_clan('#2PP')
if clan:
    print(f"Clan: {clan['name']}")
    print(f"Niveau: {clan['clanLevel']}")
    print(f"Membres: {clan['members']}")
```

### PHP

```php
<?php
$apiKey = 'votre_cle_api';
$baseUrl = 'https://api.clashofclans.com/v1';

function getClan($clanTag) {
    global $apiKey, $baseUrl;
    
    $encodedTag = urlencode($clanTag);
    $url = "$baseUrl/clans/$encodedTag";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $apiKey",
        "Accept: application/json"
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return null;
}

function getPlayer($playerTag) {
    global $apiKey, $baseUrl;
    
    $encodedTag = urlencode($playerTag);
    $url = "$baseUrl/players/$encodedTag";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $apiKey",
        "Accept: application/json"
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    }
    
    return null;
}

// Utilisation
$clan = getClan('#2PP');
if ($clan) {
    echo "Clan: " . $clan['name'] . "\n";
    echo "Niveau: " . $clan['clanLevel'] . "\n";
    echo "Membres: " . $clan['members'] . "\n";
}
?>
```

---

## ✅ Bonnes pratiques

### 1. Encodage des tags
Toujours encoder les tags de clan/joueur avec `encodeURIComponent()` (JS) ou `urlencode()` (PHP) :
```javascript
const tag = '#2PP';
const encodedTag = encodeURIComponent(tag); // %232PP
```

### 2. Gestion du cache
Implémentez un système de cache pour réduire le nombre de requêtes :
```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedClan(clanTag) {
  const cacheKey = `clan_${clanTag}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await getClan(clanTag);
  cache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });
  
  return data;
}
```

### 3. Rate Limiting
Respectez les limites de requêtes pour éviter d'être bloqué :
- Implémentez des délais entre les requêtes
- Utilisez une file d'attente (queue) pour les requêtes multiples
- Ne faites pas plus de 10 requêtes par seconde par token

```javascript
class RateLimiter {
  constructor(requestsPerSecond = 10) {
    this.queue = [];
    this.requestsPerSecond = requestsPerSecond;
    this.interval = 1000 / requestsPerSecond;
    this.processing = false;
  }
  
  async execute(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }
    
    setTimeout(() => {
      this.processing = false;
      this.process();
    }, this.interval);
  }
}

// Utilisation
const limiter = new RateLimiter(10);
const result = await limiter.execute(() => getClan('#2PP'));
```

### 4. Retry Logic
Implémentez une logique de nouvelle tentative en cas d'échec :
```javascript
async function fetchWithRetry(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}
```

### 5. Validation des données
Vérifiez toujours les données avant utilisation :
```javascript
function validateClan(clan) {
  if (!clan || typeof clan !== 'object') {
    throw new Error('Invalid clan data');
  }
  
  if (!clan.tag || !clan.name) {
    throw new Error('Missing required clan properties');
  }
  
  return true;
}
```

---

## ⚠️ Gestion des erreurs

### Codes HTTP courants

| Code | Signification | Action |
|------|---------------|--------|
| 200 | Succès | Traiter les données |
| 400 | Requête invalide | Vérifier les paramètres |
| 403 | Accès refusé | Vérifier la clé API |
| 404 | Non trouvé | Tag incorrect ou inexistant |
| 429 | Trop de requêtes | Attendre avant de réessayer |
| 500 | Erreur serveur | Réessayer plus tard |
| 503 | Service indisponible | Maintenance, réessayer |

### Exemple de gestion d'erreurs

```javascript
async function safeApiCall(apiFunction, ...args) {
  try {
    const result = await apiFunction(...args);
    return { success: true, data: result };
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Unknown error';
      
      switch (status) {
        case 400:
          console.error('Paramètres invalides:', message);
          break;
        case 403:
          console.error('Clé API invalide ou IP non autorisée');
          break;
        case 404:
          console.error('Ressource non trouvée:', message);
          break;
        case 429:
          console.error('Limite de requêtes atteinte, attendez...');
          await new Promise(r => setTimeout(r, 30000));
          return safeApiCall(apiFunction, ...args);
        case 503:
          console.error('API en maintenance');
          break;
        default:
          console.error(`Erreur ${status}:`, message);
      }
      
      return { success: false, error: { status, message } };
    }
    
    console.error('Erreur réseau:', error.message);
    return { success: false, error: { message: error.message } };
  }
}
```

---

## 🚫 Limites et restrictions

### Limites de requêtes
- **10 requêtes par seconde** par token recommandé
- Dépassement = risque de ban temporaire (30-60 secondes)
- Abus répété = ban IP possible

### Restrictions de clé API
- Une clé = une adresse IP
- Changement d'IP = nouvelle clé requise
- Les clés peuvent être révoquées en cas d'abus

### Limites de données
- Pagination par défaut : 20 résultats
- Maximum par page : variable selon l'endpoint (souvent 200)
- Paramètres `after` et `before` pour la pagination

### Restrictions de recherche
- Nom de clan : minimum 3 caractères
- Au moins un critère de recherche requis
- Combinaison de filtres pour affiner les résultats

### Données privées
- Journal de guerre : uniquement si public
- Guerres en cours : visibles uniquement pour les membres
- Certaines stats peuvent être masquées par les joueurs

---

## 📊 Structures de données importantes

### Clan
```json
{
  "tag": "#2PP",
  "name": "Nom du Clan",
  "type": "inviteOnly",
  "description": "Description",
  "location": {
    "id": 32000038,
    "name": "Canada",
    "isCountry": true,
    "countryCode": "CA"
  },
  "badgeUrls": {
    "small": "https://...",
    "large": "https://...",
    "medium": "https://..."
  },
  "clanLevel": 15,
  "clanPoints": 45000,
  "clanBuilderBasePoints": 30000,
  "clanCapitalPoints": 50000,
  "capitalLeague": {
    "id": 85000019,
    "name": "Champion League III"
  },
  "requiredTrophies": 2000,
  "warFrequency": "always",
  "warWinStreak": 5,
  "warWins": 150,
  "warTies": 10,
  "warLosses": 45,
  "isWarLogPublic": true,
  "warLeague": {
    "id": 48000015,
    "name": "Champion League III"
  },
  "members": 50,
  "memberList": [...]
}
```

### Player
```json
{
  "tag": "#8L9L9GL00",
  "name": "Nom du Joueur",
  "townHallLevel": 14,
  "townHallWeaponLevel": 5,
  "expLevel": 200,
  "trophies": 5000,
  "bestTrophies": 5500,
  "warStars": 1500,
  "attackWins": 2000,
  "defenseWins": 1800,
  "builderHallLevel": 9,
  "builderBaseTrophies": 4000,
  "bestBuilderBaseTrophies": 4500,
  "role": "member",
  "donations": 500,
  "donationsReceived": 300,
  "clan": {
    "tag": "#2PP",
    "name": "Nom du Clan",
    "clanLevel": 15,
    "badgeUrls": {...}
  },
  "league": {
    "id": 29000022,
    "name": "Legend League",
    "iconUrls": {...}
  },
  "achievements": [...],
  "troops": [...],
  "heroes": [...],
  "spells": [...]
}
```

### War
```json
{
  "state": "inWar",
  "teamSize": 50,
  "preparationStartTime": "20240115T120000.000Z",
  "startTime": "20240116T120000.000Z",
  "endTime": "20240117T120000.000Z",
  "clan": {
    "tag": "#2PP",
    "name": "Mon Clan",
    "badgeUrls": {...},
    "clanLevel": 15,
    "attacks": 85,
    "stars": 120,
    "destructionPercentage": 85.5,
    "members": [...]
  },
  "opponent": {
    "tag": "#ABC",
    "name": "Clan Adverse",
    "stars": 110,
    "destructionPercentage": 80.2,
    "members": [...]
  }
}
```

---

## 🔧 Outils et ressources

### Bibliothèques officielles et communautaires
- **coc.py** (Python) : Wrapper Python complet
- **clash-of-clans-api** (Node.js) : Client JavaScript
- **ClashClient** (.NET) : Bibliothèque .NET Framework
- **clash** (R) : Interface R pour l'API

### Outils de test
- **Postman** : Collections disponibles pour tester l'API
- **Swagger UI** : Interface interactive sur developer.clashofclans.com

### Ressources communautaires
- **RoyaleAPI** : Outils et statistiques
- **ClashKing Bot** : Bot Discord utilisant l'API
- Forums et Discord communautaires

---

## 📝 Cas d'usage courants

### 1. Suivi des statistiques de clan
```javascript
async function trackClanStats(clanTag) {
  const clan = await getClan(clanTag);
  const members = await getClanMembers(clanTag);
  
  return {
    name: clan.name,
    level: clan.clanLevel,
    memberCount: clan.members,
    totalDonations: members.reduce((sum, m) => sum + m.donations, 0),
    averageTrophies: members.reduce((sum, m) => sum + m.trophies, 0) / members.length,
    warStats: {
      wins: clan.warWins,
      losses: clan.warLosses,
      ties: clan.warTies,
      winRate: (clan.warWins / (clan.warWins + clan.warLosses + clan.warTies) * 100).toFixed(2)
    }
  };
}
```

### 2. Analyser les guerres de clan
```javascript
async function analyzeWar(clanTag) {
  const war = await getCurrentWar(clanTag);
  
  if (war.state === 'notInWar') {
    return { message: 'Pas de guerre en cours' };
  }
  
  const ourClan = war.clan;
  const theirClan = war.opponent;
  
  return {
    state: war.state,
    teamSize: war.teamSize,
    us: {
      attacks: ourClan.attacks,
      stars: ourClan.stars,
      destruction: ourClan.destructionPercentage,
      attacksRemaining: (war.teamSize * 2) - ourClan.attacks
    },
    them: {
      attacks: theirClan.attacks,
      stars: theirClan.stars,
      destruction: theirClan.destructionPercentage,
      attacksRemaining: (war.teamSize * 2) - theirClan.attacks
    },
    prediction: ourClan.stars > theirClan.stars ? 'Victoire probable' : 'Défaite probable'
  };
}
```

### 3. Monitorer les donations
```javascript
async function checkDonations(clanTag, minDonations = 100) {
  const members = await getClanMembers(clanTag);
  
  const lowDonors = members
    .filter(m => m.donations < minDonations)
    .sort((a, b) => a.donations - b.donations);
  
  const topDonors = members
    .sort((a, b) => b.donations - a.donations)
    .slice(0, 5);
  
  return {
    totalDonations: members.reduce((sum, m) => sum + m.donations, 0),
    averageDonations: members.reduce((sum, m) => sum + m.donations, 0) / members.length,
    lowDonors: lowDonors.map(m => ({
      name: m.name,
      donations: m.donations
    })),
    topDonors: topDonors.map(m => ({
      name: m.name,
      donations: m.donations
    }))
  };
}
```

---

## 🎯 Conseils finaux

1. **Testez en développement** : Utilisez des données de test avant la production
2. **Documentez votre code** : Facilitez la maintenance
3. **Respectez les ToS** : Lisez et suivez les conditions d'utilisation de Supercell
4. **Optimisez les requêtes** : Minimisez le nombre d'appels API
5. **Gérez les erreurs** : Prévoyez tous les cas d'erreur possibles
6. **Utilisez HTTPS** : Toujours pour la sécurité
7. **Ne partagez pas votre clé** : Gardez vos credentials sécurisées
8. **Surveillez vos quotas** : Évitez les abus et les bans

---

## 📚 Ressources supplémentaires

- **Documentation officielle** : https://developer.clashofclans.com/#/documentation
- **Créer un compte développeur** : https://developer.clashofclans.com/#/register
- **Termes de service** : http://supercell.com/en/terms-of-service/
- **Support** : Contactez via le site développeur

---

**Note** : Cette documentation est basée sur l'API v1. Vérifiez toujours la documentation officielle pour les mises à jour et changements.