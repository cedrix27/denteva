# Denteva

## Backend local

1. Créez un projet PostgreSQL (Supabase est recommandé) et copiez l’URL de connexion dans `.env` à partir de `.env.example`.
2. Générez le client : `npm run db:generate`.
3. Créez la première migration : `npm run db:migrate -- --name init`.
4. Lancez l’application : `npm run dev`.

Le schéma est multi-cabinet : chaque ressource métier appartient à un `Cabinet`. Les routes applicatives devront toujours résoudre le cabinet du membre connecté avant toute lecture ou écriture.
