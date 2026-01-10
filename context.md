Application web

Sujet : Clash of clans

Tech :
- Frontend + Backend: Nuxt 3 + Nitro (Vercel)
- DB + Auth: Supabase (gratuit)
- Déploiement: Git push → Vercel auto-deploys

Description :
Application web clash of clans qui permet aux admins (3-4 user) de gérer
les inscriptions aux ligues, guerres de clans, les stratégies d'attaques en ligue légende
ainsi que plusieurs autres fonctionnalités. Le but est de permettre aux chef et chef adjoint d'un
clan de mieux s'organiser et de mieux choisir quel membre peut participer aux divers évènements.

Pages :
- Dashboard initial avec plusieurs stats des autres pages
- Ligues de guerre
- Guerre de clans
- Lien de base de défense
- Stratégie d'attaque

Pour les ligues de guerre, il faut :
- La liste des clans 
- La liste des membres 
- Le statut de clan
- Liste des membres en jeu (15 participants max)
- Liste des membres en réserve (les autres inscrit)

Pour les guerre e clans, il faut :
- Stats des derniers membres
- Liste des membres qui n'ont pas attaqué
- Liste des membres qui ont fait 1 étoile sur 3

Pour les liens de base de défense :
- Liste des bases par hotel de ville (navbar avec hdv17 ou hdv18)
- Liste des bases par membre 
- Liste des bases par étoile (1, 2, 3) maximum

Pour les stratégie d'attaque :
- Liste des compos par type (navbar avec sol ou aérien)
- Liste des liens de compos d'attaques

Questions pratique :
- Comment récuperer les données directement depuis l'API de Clash Of Clans comme le font les sites ClashOfStat, ClashSpot, etc. ?