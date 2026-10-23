// Catalogue du Vestiaire. Prix en tampons (monnaie du jeu, jamais d'argent réel), triplés le 22/10/2026.
// « badge » : article exclusif, en vente seulement pour les joueurs qui ont ce badge (jamais offert).

export const SLOTS = [
  ["hat", "Chapeaux"],
  ["glasses", "Lunettes"],
  ["earrings", "Boucles"],
  ["top", "Hauts"],
  ["pet", "Compagnons"],
  ["bg", "Fonds"],
];

export const RARITY = {
  commune: { label: "Commune", color: "text-muted" },
  rare: { label: "Rare", color: "text-ink" },
  epique: { label: "Épique", color: "text-fluo" },
  legendaire: { label: "Légendaire", color: "text-leaf" },
};

const item = (slot, id, name, price, level, rarity, badge) => ({ slot, id, name, price, level, rarity, badge });

export const ITEMS = [
  item("hat", "cap", "Casquette", 180, 1, "commune"),
  item("hat", "bob", "Bob", 240, 1, "commune"),
  item("hat", "beret", "Béret", 360, 2, "commune"),
  item("hat", "beanie", "Bonnet à pompon", 450, 3, "rare"),
  item("hat", "cowboy", "Chapeau de cowboy", 750, 4, "rare"),
  item("hat", "flowers", "Couronne de fleurs", 900, 5, "rare"),
  item("hat", "tophat", "Haut-de-forme", 1350, 7, "epique"),
  item("hat", "beer", "Casque à bière", 2700, 9, "legendaire"),
  item("hat", "crown", "Couronne", 3000, 10, "legendaire"),
  item("hat", "laurel", "Couronne de laurier", 1200, 1, "epique", "sans-faute"),
  item("hat", "pilot", "Casque d'aviateur", 1200, 1, "epique", "pile-poil"),
  item("hat", "space-helmet", "Casque d'astronaute", 1200, 1, "epique", "centurion"),

  item("glasses", "round", "Lunettes rondes", 180, 1, "commune"),
  item("glasses", "aviator", "Aviateur", 450, 2, "rare"),
  item("glasses", "hearts", "Lunettes cœur", 600, 3, "rare"),
  item("glasses", "ski", "Masque de ski", 900, 4, "rare"),
  item("glasses", "pixel", "Lunettes pixel", 1050, 5, "epique"),
  item("glasses", "monocle", "Monocle", 1500, 8, "epique"),
  item("glasses", "binary", "Visière binaire", 1200, 1, "epique", "maitre-xx"),

  item("earrings", "hoops", "Anneaux", 180, 1, "commune"),
  item("earrings", "pearls", "Perles", 360, 2, "commune"),
  item("earrings", "globes", "Mini-globes", 900, 5, "rare"),
  item("earrings", "bolts", "Éclairs", 1200, 1, "epique", "serie-de-feu"),

  item("top", "tee-ink", "T-shirt encre", 120, 1, "commune"),
  item("top", "tee-fluo", "T-shirt fluo", 120, 1, "commune"),
  item("top", "tee-leaf", "T-shirt vert", 120, 1, "commune"),
  item("top", "mariniere", "Marinière", 450, 2, "rare"),
  item("top", "hoodie", "Hoodie", 600, 3, "rare"),
  item("top", "hawaii", "Chemise hawaïenne", 900, 4, "rare"),
  item("top", "flight", "Veste d'aviateur", 1350, 6, "epique"),
  item("top", "astronaut", "Combinaison d'astronaute", 2400, 1, "legendaire", "marathon"),

  item("pet", "parrot", "Perroquet", 1200, 4, "rare"),
  item("pet", "cat", "Chat", 1200, 4, "rare"),
  item("pet", "gecko", "Gecko", 1350, 5, "rare"),
  item("pet", "penguin", "Pingouin", 1500, 6, "epique"),
  item("pet", "kangaroo", "Kangourou", 1800, 7, "epique"),
  item("pet", "llama", "Lama", 2250, 9, "legendaire"),
  item("pet", "pigeon", "Pigeon voyageur", 1200, 1, "epique", "cartographe"),

  item("bg", "bg-sun", "Fond soleil", 90, 1, "commune"),
  item("bg", "bg-ink", "Fond encre", 90, 1, "commune"),
  item("bg", "bg-leaf", "Fond vert", 90, 1, "commune"),
  item("bg", "bg-stamp", "Tampon de passeport", 600, 2, "rare"),
  item("bg", "bg-map", "Carte du monde", 750, 3, "rare"),
  item("bg", "bg-stars", "Ciel étoilé", 1200, 6, "epique"),
  item("bg", "bg-sunrise", "Lever de soleil", 1500, 7, "epique"),
  item("bg", "bg-rainbow", "Arc-en-ciel pailleté", 2400, 1, "legendaire", "assidu"),
];

export const ITEM = new Map(ITEMS.map((i) => [i.id, i]));

// Personnalisation gratuite de base.
export const BASE = {
  skin: ["#f5d0b5", "#e8b48f", "#c98e65", "#9a6644", "#6b4430"],
  hair: [
    ["court", "Court"],
    ["mi-long", "Mi-long"],
    ["long", "Long"],
    ["boucles", "Bouclé"],
    ["chignon", "Chignon"],
    ["couettes", "Couettes"],
    ["mulet", "Mulet"],
    ["chauve", "Chauve"],
  ],
  hairColor: ["#17140d", "#5a3a22", "#b5652b", "#e8c25a", "#d9d2c4", "#2340c4", "#d42a3a", "#f27ab0"],
  eyes: [
    ["ronds", "Ronds"],
    ["rieurs", "Rieurs"],
    ["decides", "Décidés"],
    ["clin", "Clin d'œil"],
    ["pas-content", "Pas content"],
  ],
};

export const DEFAULT_LOOK = {
  skin: BASE.skin[1],
  hair: "court",
  hairColor: BASE.hairColor[1],
  eyes: "ronds",
  hat: null,
  glasses: null,
  earrings: null,
  top: null,
  pet: null,
  bg: null,
};

// Tenue reçue de l'extérieur (navigateur, autre joueur) : on ne garde que des valeurs connues et des articles possédés.
export function cleanLook(look, owned) {
  const l = look && typeof look === "object" ? look : {};
  const pick = (v, list, fallback) => (list.includes(v) ? v : fallback);
  const out = {
    skin: pick(l.skin, BASE.skin, DEFAULT_LOOK.skin),
    hair: pick(l.hair, BASE.hair.map(([id]) => id), DEFAULT_LOOK.hair),
    hairColor: pick(l.hairColor, BASE.hairColor, DEFAULT_LOOK.hairColor),
    eyes: pick(l.eyes, BASE.eyes.map(([id]) => id), DEFAULT_LOOK.eyes),
  };
  for (const [slot] of SLOTS) {
    const it = ITEM.get(l[slot]);
    out[slot] = it && it.slot === slot && owned.includes(it.id) ? it.id : null;
  }
  return out;
}
