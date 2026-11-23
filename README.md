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
  assets/              moteur de quiz partagé (quiz.js) et ses styles (quiz.css)
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

## Le format des quiz

Chaque fiche définit une constante `QS` (la liste de ses questions) ; le moteur `assets/quiz.js` fait le reste : modes entraînement et examen blanc, trois niveaux, chronomètre, bilan par niveau et par thème, correction détaillée, reprise des erreurs, meilleur score affiché dans le classeur.

```
{q:"Énoncé", o:["A","B","C"], a:1, w:"Explication", l:2, t:"Thème"}           choix unique (a = indice)
{q:"Énoncé", o:["A","B","C","D"], a:[0,2], w:"…", l:3, t:"Thème"}            plusieurs bonnes réponses
{q:"Énoncé", num:12.5, tol:0.1, u:"cm", w:"…", l:2, t:"Thème"}              réponse numérique
```

`l` vaut 1 (facile), 2 (moyen) ou 3 (difficile). Les fiches marquées « Pour aller plus loin » contiennent des notions hors programme du cycle 4 (signalées comme telles).
