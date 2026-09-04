# Connexion Meta WhatsApp Business

## Ce que Denteva possède

- Une application Meta Business unique pour toute la plateforme.
- Un endpoint webhook public : `https://VOTRE-DOMAINE/api/webhooks/whatsapp`.
- Un `META_APP_ID`, un `META_APP_SECRET` et un `WHATSAPP_WEBHOOK_VERIFY_TOKEN` stockés dans les variables d’environnement, jamais dans le frontend.

## Ce que chaque cabinet connecte

Chaque cabinet relie son propre compte WhatsApp Business et son propre numéro via le parcours Meta Embedded Signup. À la fin, le backend reçoit/valide le compte WhatsApp Business, le `phone_number_id` et l’autorisation associée, puis les lie au cabinet connecté.

Le webhook entrant fournit le `phone_number_id`. Le backend l’utilise pour retrouver le cabinet avant de lire la Base IA ou d’appeler le LLM.

## À faire avant la connexion réelle

1. Créer l’application Meta et y ajouter le produit WhatsApp.
2. Configurer le webhook public et le token de vérification.
3. Ajouter `META_APP_ID`, `META_APP_SECRET` et `WHATSAPP_WEBHOOK_VERIFY_TOKEN` à `.env`.
4. Mettre l’application en mode production et suivre les exigences Meta pour les autorisations/validation.
5. Implémenter Embedded Signup après l’authentification : seul le cabinet connecté doit pouvoir lier son propre numéro.

Le webhook créé dans cette application vérifie la signature `X-Hub-Signature-256`, déduplique les messages Meta par leur identifiant externe et les enregistre sous le cabinet correspondant.
