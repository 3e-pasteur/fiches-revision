# Fiches de révision du brevet

Site statique : un classeur (`public/index.html`) qui répertorie des fiches de révision interactives (cours courts, méthodes, quiz corrigés). Aucun outil à installer, aucune base de données.

## Structure

```
render.yaml            configuration Render (site statique)
public/
  index.html           le classeur (recherche, onglets par matière, suivi)
  data.js              la liste des fiches
  404.html             page affichée si l'adresse n'existe pas
  fiches/              une page HTML par fiche
```

## Mettre le site en ligne sur Render

1. Créez un dépôt GitHub (ou GitLab) et envoyez-y tout le contenu de ce dossier.
2. Sur Render : **New** puis **Blueprint**, choisissez le dépôt. Render lit `render.yaml` et crée le site.
   Sans Blueprint : **New** puis **Static Site**, *Build Command* : `echo ok`, *Publish Directory* : `public`.
3. Une fois le déploiement terminé, le site est accessible sur une adresse en `.onrender.com`.

À chaque `git push`, Render redéploie automatiquement.

## Ajouter une fiche

1. Copiez une fiche existante dans `public/fiches/` et modifiez-la (le cours, le tableau `QS` du quiz, le titre).
2. Ajoutez une entrée dans `public/data.js` (identifiant unique, titre, matière, niveau, date, description, `url: "fiches/mon-fichier.html"`).
3. Les matières reconnues, avec leur couleur : Français, Maths, Histoire, Géographie, EMC, SVT, Physique-chimie, Technologie, Général.
4. Envoyez la modification sur le dépôt.

## À savoir

- Les cases « Révisée », les scores des quiz et les préférences sont enregistrés dans le navigateur de chaque appareil. Ils ne sont pas partagés entre appareils.
- Le site est public : toute personne ayant l'adresse peut le consulter. Il ne contient aucune donnée personnelle.
- Pour tester en local, ouvrez simplement `public/index.html` dans un navigateur.
- Les polices viennent de Google Fonts : sans connexion, le site reste lisible avec des polices de secours.
