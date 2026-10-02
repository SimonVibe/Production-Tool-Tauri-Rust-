# Optimisation : Support Multilingue (FR / EN)

**Objectif :** Permettre aux techniciens anglophones d'utiliser l'application, tout en gardant le français comme langue par défaut stricte au démarrage.

## Contraintes et spécifications
- **Aucune persistance** : Ne pas sauvegarder le choix de la langue dans un fichier de configuration, ni dans la base de registre, ni dans le LocalStorage.
- **Comportement par défaut** : L'application doit *toujours* démarrer en français.
- **Interface** : Ajouter un bouton de bascule simple (ex: bouton "FR / EN" ou icône 🌐) dans la barre de titre ou l'en-tête de l'application principale.

## Stratégie d'implémentation future
1. **État local (React State)** : Créer une variable d'état en mémoire (`useState<'fr' | 'en'>('fr')`) au niveau racine et la distribuer (via Props ou React Context) aux différentes fenêtres/modales.
2. **Dictionnaire centralisé** : Extraire le texte de l'interface vers un petit dictionnaire de traduction (ex: `src/locales.ts`) avec des clés pour les chaînes principales.
3. **Application de la langue** : Remplacer les textes codés en dur par une fonction de traduction qui renvoie la bonne chaîne selon l'état en mémoire.

## Points à définir au moment de l'implémentation
- Déterminer la portée de la traduction : Doit-on traduire absolument tout (y compris les lignes techniques du journal / logs) ou uniquement l'interface de navigation (titres, boutons, messages d'erreur principaux) ?
