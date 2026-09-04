# Connexion Google Calendar

## Prérequis à créer dans Google Cloud

1. Créer un projet Google Cloud pour Denteva.
2. Activer Google Calendar API.
3. Configurer l’écran de consentement OAuth.
4. Créer un client OAuth de type **Web application**.
5. Ajouter l’URI de redirection : `https://VOTRE-DOMAINE/api/integrations/google/callback`.

Ajoutez ensuite dans `.env` : `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `TOKEN_ENCRYPTION_KEY`.

Le parcours OAuth utilise le scope `calendar.events`, crée les événements dans l’agenda `primary` du cabinet et chiffre les tokens avant leur stockage. Le choix détaillé d’un agenda autre que `primary` sera ajouté après l’authentification multi-cabinet.
