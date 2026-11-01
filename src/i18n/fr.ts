/**
 * Tous les textes de l'interface. Le français est la langue de référence ;
 * l'anglais (sprint 9) reprendra la même structure dans en.ts.
 */
export const fr = {
  site: {
    name: "Klods",
    tagline: "Notices de montage en 3D, étape par étape",
    title: "Klods, notices de montage en 3D étape par étape",
    description:
      "Tape le numéro de ton set. Klods montre chaque étape en 3D, avec les pièces à prendre, et la lit à voix haute.",
  },
  nav: {
    catalogue: "Catalogue",
    workshop: "Mon atelier",
    github: "Code source sur GitHub",
    skip: "Aller au contenu",
  },
  home: {
    eyebrow: "En construction",
    title: "Monte tes sets LEGO® en 3D, étape par étape.",
    lead: "Tape le numéro inscrit sur la boîte. Chaque étape s'affiche en 3D, avec les pièces à prendre, et peut être lue à voix haute.",
    status: "Klods est en cours de construction. La préversion arrive avec le catalogue des sets.",
    howTitle: "Comment ça marche",
    steps: [
      { title: "Tape le numéro", body: "Le numéro du set est écrit sur la boîte, par exemple 4915." },
      { title: "Vérifie tes pièces", body: "Klods dessine toutes les pièces du set, avec leur nombre et leur couleur." },
      { title: "Suis chaque étape", body: "Fais tourner le modèle, vois les nouvelles pièces se poser, écoute la consigne." },
    ],
  },
  soon: {
    catalogue: {
      title: "Catalogue",
      body: "Le catalogue des sets arrive avec la préversion. Il listera tous les sets disponibles en 3D, par thème et par année.",
    },
    workshop: {
      title: "Mon atelier",
      body: "Ici apparaîtront les sets que tu as montés et ceux en cours, gardés dans ton navigateur. Aucun compte nécessaire.",
    },
    back: "Retour à l'accueil",
  },
  notFound: {
    title: "Cette page n'existe pas",
    body: "Le lien est peut-être ancien, ou le set n'est pas encore disponible.",
    back: "Retour à l'accueil",
  },
  footer: {
    disclaimer:
      "LEGO® est une marque du Groupe LEGO, qui ne parraine, n'autorise ni ne soutient ce site. Klods est un projet indépendant et non officiel.",
    inspired: "Inspiré de",
    source: "Code source",
  },
} as const;

export type Dict = typeof fr;
