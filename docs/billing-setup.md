# Activation de la facturation SaaS en production

Ce guide explique comment passer du mode "test" (mock) au mode "production"
pour les paiements via Stripe (cards) et CinetPay (Mobile Money).

## État actuel

Sans aucune configuration, l'app tourne en **mode mock** :
- Les boutons "Payer" mènent à une fausse page de succès
- Aucune transaction réelle n'a lieu
- Pratique pour tester l'UI

## 🟦 Activer Stripe (Carte bancaire, international)

### 1. Créer un compte Stripe

1. Aller sur https://dashboard.stripe.com/register
2. Compléter les infos entreprise (peut être complété plus tard pour activer le mode "live")
3. Vérifier l'email

### 2. Récupérer les clés API

Dashboard → Développeurs → Clés API :
- **Clé publique** (`pk_test_...` ou `pk_live_...`) — pas utilisée par Athenis
- **Clé secrète** (`sk_test_...` ou `sk_live_...`) ← celle qu'on veut

⚠️ **Démarrer en mode `sk_test_`** pour tester. Passer en `sk_live_` une fois l'activation Stripe complète.

### 3. Créer les Products + Prices

Dashboard → Produits → "Ajouter un produit".

Créer 3 produits (Starter, Pro, Premium). Pour chacun, créer **2 Prices** :
- 1 mensuel récurrent
- 1 annuel récurrent

| Produit  | Mensuel | Annuel | Devise |
|----------|---------|--------|--------|
| Starter  | 9 €     | 90 €   | EUR    |
| Pro      | 29 €    | 290 €  | EUR    |
| Premium  | 79 €    | 790 €  | EUR    |

⚠️ Récupérer chaque `price_id` (format `price_XXX`).

### 4. Configurer le webhook

Dashboard → Développeurs → Webhooks → Ajouter un endpoint :
- URL : `https://athenis360.com/api/billing/webhook/stripe`
- Événements à écouter :
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Récupérer le **Signing secret** (`whsec_XXX`).

### 5. Ajouter les vars d'env sur le VPS

```bash
ssh ubuntu@51.210.47.223
nano /home/ubuntu/athenis/.env

# Ajouter à la fin :
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_EUR=price_xxx
STRIPE_PRICE_STARTER_EUR_YEAR=price_xxx
STRIPE_PRICE_PRO_EUR=price_xxx
STRIPE_PRICE_PRO_EUR_YEAR=price_xxx
STRIPE_PRICE_PREMIUM_EUR=price_xxx
STRIPE_PRICE_PREMIUM_EUR_YEAR=price_xxx
```

### 6. Redémarrer le backend

```bash
cd /home/ubuntu/athenis/infra
docker compose --env-file ../.env up -d backend
```

### 7. Tester avec une carte de test

Stripe fournit des cartes de test : https://stripe.com/docs/testing
- **Succès** : `4242 4242 4242 4242` + n'importe quelle date future + n'importe quel CVV
- **Échec** : `4000 0000 0000 0002`

## 🟧 Activer CinetPay (Mobile Money, OHADA)

### 1. Créer un compte CinetPay

1. Aller sur https://app-mode.cinetpay.com/account/register
2. Compléter le formulaire (entreprise + KYC)
3. CinetPay valide ton compte (24-48h)

### 2. Récupérer les clés API

Dashboard CinetPay → "Configuration API" :
- **APIKEY** : clé API
- **SITE_ID** : identifiant de site (chiffres)
- **Secret Key** : pour vérifier les webhooks HMAC (optionnel)

### 3. Configurer le webhook

Dashboard → "Configuration" → "URL de notification" :
- `https://athenis360.com/api/billing/webhook/cinetpay`

### 4. Ajouter les vars d'env sur le VPS

```bash
ssh ubuntu@51.210.47.223
nano /home/ubuntu/athenis/.env

# Ajouter :
CINETPAY_API_KEY=xxx
CINETPAY_SITE_ID=xxx
CINETPAY_SECRET_KEY=xxx   # optionnel, pour vérif HMAC
```

### 5. Redémarrer le backend

```bash
cd /home/ubuntu/athenis/infra
docker compose --env-file ../.env up -d backend
```

### 6. Tester en sandbox

CinetPay propose un mode sandbox avec des numéros de test :
- Orange Money sandbox : 65000000
- MTN MoMo sandbox : 67000000

## ✅ Vérification que la prod est active

Aller sur https://athenis360.com/app/settings/facturation. Si tu vois :
- **Bouton "Payer X €"** sans badge "mode test" → ✅ prod active
- **Badge "mode test détecté"** → ❌ provider pas configuré

L'API `/api/billing/status` retourne aussi :
```json
{
  "capabilities": {
    "stripeEnabled": true,
    "cinetpayEnabled": true
  }
}
```

## Variables d'environnement récapitulatif

```bash
# Stripe (cards)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_EUR=price_xxx
STRIPE_PRICE_STARTER_EUR_YEAR=price_xxx
STRIPE_PRICE_PRO_EUR=price_xxx
STRIPE_PRICE_PRO_EUR_YEAR=price_xxx
STRIPE_PRICE_PREMIUM_EUR=price_xxx
STRIPE_PRICE_PREMIUM_EUR_YEAR=price_xxx

# CinetPay (Mobile Money OHADA)
CINETPAY_API_KEY=xxx
CINETPAY_SITE_ID=xxx
CINETPAY_SECRET_KEY=xxx  # optionnel pour HMAC

# SMS (pour MFA SMS, indépendant du billing)
SMS_PROVIDER=africastalking   # ou twilio, vonage
AT_USERNAME=xxx
AT_API_KEY=xxx
AT_FROM=Athenis
```

## Tarifs producteurs (à savoir)

| Service | Frais | Note |
|---|---|---|
| Stripe | 1.4% + 0.25 € (UE) / 2.9% + 0.30 $ (US/Intl) | Pas de frais d'inscription |
| CinetPay | 1.5% à 2.5% selon volume | Pas de frais d'inscription |

Ces frais sont **prélevés sur les revenus** — pas de coût fixe pour Athenis.
