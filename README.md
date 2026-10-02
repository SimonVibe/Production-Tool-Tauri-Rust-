# Outil Update OPEQ

Application utilitaire pour les tests et la configuration matérielle, conçue pour être compilée en exécutable portable (.exe).

## Prérequis
- [Node.js](https://nodejs.org/) (Version 18 ou supérieure recommandée)
- npm (généralement inclus avec Node.js)

## Installation des dépendances

Avant de pouvoir lancer ou compiler l'application, vous devez installer les modules requis.
Ouvrez un terminal (ou l'invite de commande) dans le dossier du projet et exécutez :

```bash
npm install
```

## Compilation (Création de l'exécutable .exe)

Pour générer le fichier exécutable `.exe` portable qui peut être lancé depuis une clé USB ou un répertoire réseau, exécutez la commande suivante :

```bash
npm run electron:build
```

Une fois la compilation terminée, l'exécutable final se trouvera dans le dossier `dist-electron`. Vous pourrez le copier sur votre clé USB ou votre réseau.

## Développement et tests

Pour lancer l'application en mode développement afin de tester des modifications (avec rechargement à chaud) :

```bash
npm run electron:dev
```
