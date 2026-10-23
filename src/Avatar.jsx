// Avatar en SVG, style risographie (contours encre, ombre orange décalée). Repère 120×120, tête centrée en (60, 54).
import { useId } from "react";
import { DEFAULT_LOOK } from "./items.js";

const INK = "#2340c4", FLUO = "#ff5a1e", LEAF = "#00a95c", SUN = "#f2b632", NIGHT = "#17140d";
const PAPER = "#f1ecdd", DEEP = "#e7e0cc", CARD = "#fffaf0", PINK = "#f27ab0";
const line = { stroke: NIGHT, strokeWidth: 2.2, strokeLinejoin: "round", strokeLinecap: "round" };
const thin = { ...line, strokeWidth: 1.2 };

const BODY = "M12,124 C14,100 34,89 60,89 C86,89 106,100 108,124 Z";
const CAP = "M37,52 C35,33 46,26 60,26 C75,26 85,33 83,52 C80,44 74,39 66,40 C62,36 54,35 50,38 C44,40 40,45 37,52 Z";
// Dessus du mulet : le même contour que CAP, mais avec du volume sur le crâne
const LONG_TOP = "M37,74 C34,64 34,55 37,48 C33,30 46,22 60,22 C74,22 87,30 83,48 C86,55 86,64 83,74 C80,64 79,54 77,47 C70,44 62,41 56,35 C52,42 45,45 43,48 C41,56 40,65 37,74 Z"; // même contour que les pans de derrière
// Sous un chapeau : même frange, dessus aplati pour ne pas dépasser du couvre-chef.
const MULLET_HATTED = "M37,52 C34,34 45,26 60,26 C75,26 86,34 83,52 C80,43 75,38 67,38 C63,34 55,33 50,36 C44,38 40,44 37,52 Z";
const MULLET_TOP = "M37,52 C33,30 45,17 60,18 C75,17 87,30 83,52 C80,43 75,38 67,38 C63,34 55,33 50,36 C44,38 40,44 37,52 Z";

/* ---------- Fonds ---------- */
// Étoile à 4 branches, la même que celle du ciel étoilé, centrée en (x, y), rayon s.
const sparkle = (x, y, s) => {
  const [a, b] = [s * 0.28, s * 0.72];
  return `M${x},${y - s} l${a},${b} l${b},${a} l${-b},${a} l${-a},${b} l${-a},${-b} l${-b},${-a} l${b},${-a} Z`;
};
// Paillettes de l'arc-en-ciel : [x, y, taille] autour de la tête (le reste est caché par l'avatar).
const GLITTER = [
  [20, 30, 5.5], [99, 22, 5], [13, 64, 4.5], [107, 58, 5], [43, 9, 3.5], [79, 8, 3.5], [30, 46, 3], [92, 40, 3],
  [23, 82, 3.5], [101, 79, 3], [61, 5, 2.2], [9, 44, 2.2], [111, 39, 2.2], [34, 21, 2], [87, 27, 2], [8, 79, 2],
  [113, 73, 2], [51, 18, 1.8], [71, 17, 1.8], [26, 62, 2.2], [95, 63, 1.8], [16, 88, 2.4], [104, 90, 2], [39, 10, 1.6],
];
const GLITTER_DOTS = [
  [28, 11], [69, 4], [16, 51], [104, 47], [38, 33], [84, 35], [6, 57], [114, 62], [19, 73], [99, 69], [47, 4], [92, 12],
  [40, 26], [80, 25], [60, 13], [14, 36], [106, 30], [8, 68], [112, 51], [29, 90], [93, 92], [31, 72], [89, 77], [21, 19],
];

const BACKGROUNDS = {
  none: <rect width="120" height="120" fill={DEEP} />,
  "bg-sun": <rect width="120" height="120" fill={SUN} />,
  "bg-ink": <rect width="120" height="120" fill={INK} />,
  "bg-leaf": <rect width="120" height="120" fill={LEAF} />,
  "bg-stamp": (
    <>
      <rect width="120" height="120" fill={PAPER} />
      <circle cx="60" cy="60" r="46" fill="none" stroke={FLUO} strokeWidth="3" opacity=".75" />
      <circle cx="60" cy="60" r="39" fill="none" stroke={FLUO} strokeWidth="1.4" strokeDasharray="3 3" opacity=".75" />
      <path d="M22,60 H34 M86,60 H98" stroke={FLUO} strokeWidth="2" opacity=".75" />
    </>
  ),
  "bg-map": (
    <>
      <rect width="120" height="120" fill={INK} />
      <g fill={PAPER} opacity=".22">
        <path d="M8,30 C18,22 34,24 38,34 C40,44 30,48 24,58 C20,64 12,60 10,50 Z" />
        <path d="M30,66 C38,64 42,74 38,86 C36,96 30,104 26,96 C22,86 24,72 30,66 Z" />
        <path d="M54,22 C64,16 80,18 84,26 C80,32 70,30 64,34 C58,36 52,30 54,22 Z" />
        <path d="M58,40 C70,38 76,48 72,62 C68,74 60,80 56,68 C52,58 50,46 58,40 Z" />
        <path d="M80,30 C96,24 114,32 114,44 C108,52 96,48 88,54 C82,50 78,40 80,30 Z" />
        <path d="M94,74 C102,72 110,78 108,86 C102,90 94,88 92,82 Z" />
      </g>
    </>
  ),
  "bg-stars": (
    <>
      <rect width="120" height="120" fill="#141a3a" />
      {[[16, 20], [34, 12], [90, 16], [104, 34], [22, 44], [98, 58], [12, 70], [108, 82], [70, 10], [50, 24]].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r={k % 3 ? 1 : 1.8} fill={k % 4 ? CARD : SUN} />
      ))}
      <path d="M86,30 l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2 l5,-2 Z" fill={SUN} />
    </>
  ),
  "bg-rainbow": (
    <>
      <rect width="120" height="120" fill="#bfe3f4" />
      {[FLUO, "#ffa12b", "#ffe14d", LEAF, INK, "#7a5cc4"].map((c, k) => (
        <circle key={c} cx="60" cy="118" r={96 - k * 8} fill="none" stroke={c} strokeWidth="8.5" />
      ))}
      {GLITTER.map(([x, y, s], k) => <path key={k} d={sparkle(x, y, s)} fill={k % 3 ? CARD : SUN} />)}
      {GLITTER_DOTS.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k % 2 ? 0.8 : 1.2} fill={CARD} />)}
    </>
  ),
  "bg-sunrise": (
    <>
      <rect width="120" height="120" fill={FLUO} />
      <rect y="40" width="120" height="30" fill="#ff7a45" />
      <rect y="70" width="120" height="50" fill={SUN} />
      <circle cx="60" cy="98" r="30" fill={CARD} opacity=".55" />
    </>
  ),
};

/* ---------- Hauts (dessinés sur la forme des épaules) ---------- */
function Top({ id }) {
  const stripes = useId(); // un id par avatar : plusieurs marinières peuvent cohabiter sur la page
  const shirt = (fill) => <path d={BODY} fill={fill} {...line} />;
  const collar = <path d="M50,89 Q60,98 70,89" fill="none" {...line} />;
  switch (id) {
    case "tee-ink":
      return <>{shirt(INK)}{collar}</>;
    case "tee-fluo":
      return <>{shirt(FLUO)}{collar}</>;
    case "tee-leaf":
      return <>{shirt(LEAF)}{collar}</>;
    case "mariniere":
      return (
        <>
          {shirt(CARD)}
          <clipPath id={stripes}>
            <path d={BODY} />
          </clipPath>
          <g clipPath={`url(#${stripes})`} fill={INK}>
            {[97, 105, 113, 121].map((y) => <rect key={y} x="0" y={y} width="120" height="3.6" />)}
          </g>
          <path d={BODY} fill="none" {...line} />
          <path d="M46,90 Q60,95 74,90" fill="none" {...line} />
        </>
      );
    case "hoodie":
      return (
        <>
          {shirt("#5c5647")}
          <path d="M40,94 Q60,80 80,94 Q72,100 60,100 Q48,100 40,94 Z" fill="#4a453a" {...line} />
          <path d="M55,99 L54,110 M65,99 L66,110" stroke={CARD} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44,118 Q60,110 76,118" fill="none" {...thin} />
        </>
      );
    case "hawaii":
      return (
        <>
          {shirt(FLUO)}
          {[[34, 106], [80, 104], [92, 116], [24, 118], [60, 114]].map(([x, y]) => (
            <g key={x}>
              <circle cx={x} cy={y} r="4" fill={SUN} />
              <circle cx={x} cy={y} r="1.4" fill={NIGHT} />
              <path d={`M${x + 4},${y + 2} q4,1 6,-2`} stroke={LEAF} strokeWidth="2.4" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <path d="M50,89 L60,104 L54,90 Z M70,89 L60,104 L66,90 Z" fill="#ff8a5c" {...thin} />
        </>
      );
    case "flight":
      return (
        <>
          {shirt("#55623a")}
          <path d="M60,100 V124" {...thin} />
          <path d="M38,94 Q48,86 60,97 Q72,86 82,94 Q78,102 60,102 Q42,102 38,94 Z" fill={DEEP} {...line} />
        </>
      );
    case "astronaut":
      return (
        <>
          {shirt("#f4f4f4")}
          <ellipse cx="60" cy="90" rx="15" ry="4.5" fill="#c9c9c9" {...line} />
          <rect x="50" y="104" width="20" height="12" rx="2" fill={INK} {...line} />
          <circle cx="55" cy="110" r="1.4" fill={LEAF} />
          <circle cx="60" cy="110" r="1.4" fill={SUN} />
          <circle cx="65" cy="110" r="1.4" fill={FLUO} />
          <circle cx="86" cy="106" r="5" fill={FLUO} {...thin} />
        </>
      );
    default:
      return <>{shirt(CARD)}{collar}</>;
  }
}

/* ---------- Cheveux ---------- */
// Derrière le corps (dessiné avant le haut) : remplit l'espace entre le cou et les mèches, le col passe par-dessus.
function HairBehind({ style, color }) {
  if (style === "long") return <path d="M37,48 C33,30 46,22 60,22 C74,22 87,30 83,48 C88,62 90,80 88,100 L32,100 C30,80 32,62 37,48 Z" fill={color} {...line} />;
  if (style === "mi-long") return <path d="M37,48 C33,30 46,22 60,22 C74,22 87,30 83,48 C87,60 88,72 86,82 L34,82 C32,72 33,60 37,48 Z" fill={color} {...line} />;
  return null;
}

// Par-dessus les épaules, derrière la tête.
function HairBack({ style, color }) {
  // Longs : deux pans pleins qui tombent jusqu'aux épaules (pointes arrondies)
  if (style === "long")
    return (
      <path
        d="M37,48 C33,64 30,88 32,106 Q38,111 45,106 C46,96 46,84 47,74 L73,74 C74,84 74,96 75,106 Q82,111 88,106 C90,88 87,64 83,48 C87,30 74,22 60,22 C46,22 33,30 37,48 Z"
        fill={color}
        {...line}
      />
    );
  // Mi-longs : les mêmes pans que les longs, coupés au niveau du menton
  if (style === "mi-long")
    return (
      <path
        d="M37,48 C34,60 31,72 33,83 Q39,89 46,84 C46,80 47,77 47,74 L73,74 C73,77 74,80 74,84 Q81,89 87,83 C89,72 86,60 83,48 C87,30 74,22 60,22 C46,22 33,30 37,48 Z"
        fill={color}
        {...line}
      />
    );
  // Mulet : côtés courts (caché derrière le visage), la nuque ressort sous la mâchoire et s'arrête au ras
  // des épaules, pointes relevées, en contournant le col
  if (style === "mulet")
    return (
      <path
        d="M47,60 C46,68 46,74 45,79 C43,83 41,86 39,89 Q45,93 50,89 C51,86 52,84 53,82 L67,82 C68,84 69,86 70,89 Q75,93 81,89 C79,86 77,83 75,79 C74,74 74,68 73,60 Z"
        fill={color}
        {...line}
      />
    );
  // Couettes : deux mèches attachées en haut des tempes, qui retombent sur les épaules
  if (style === "couettes")
    return (
      <g fill={color} {...line}>
        <path d="M40,41 C27,40 20,52 22,66 C23,74 28,80 33,83 C30,74 31,64 38,54 Z" />
        <path d="M80,41 C93,40 100,52 98,66 C97,74 92,80 87,83 C90,74 89,64 82,54 Z" />
      </g>
    );
  return null;
}

// hatted : un chapeau est porté (seul le mulet, très haut sur le crâne, a besoin d'un dessus aplati).
function HairFront({ style, color, hatted }) {
  const p = { fill: color, ...line };
  switch (style) {
    case "mulet":
      return <path d={hatted ? MULLET_HATTED : MULLET_TOP} {...p} />;
    // Mi-longs et longs : raie sur le côté, les mèches encadrent le visage et rejoignent les pans de derrière.
    case "mi-long":
    case "long":
      return <path d={LONG_TOP} {...p} />;
    case "boucles":
      return (
        <g {...p}>
          {[[40, 46], [43, 36], [50, 29], [60, 26], [70, 29], [77, 36], [80, 46]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="7.5" />)}
        </g>
      );
    case "chignon":
      return (
        <>
          <circle cx="60" cy="22" r="9" {...p} />
          <path d="M37,50 C35,33 46,28 60,28 C74,28 85,33 83,50 C76,40 68,36 60,36 C52,36 44,40 37,50 Z" {...p} />
        </>
      );
    case "couettes":
      return (
        <>
          <path d={CAP} {...p} />
          <circle cx="38" cy="43" r="3.4" fill={FLUO} {...thin} />
          <circle cx="82" cy="43" r="3.4" fill={FLUO} {...thin} />
        </>
      );
    case "chauve":
      return <path d="M45,37 Q51,32 58,32" fill="none" stroke={CARD} strokeWidth="2.6" strokeLinecap="round" opacity=".75" />; // reflet sur le crâne
    default:
      return <path d={CAP} {...p} />; // court
  }
}

/* ---------- Visage ---------- */
function Face({ eyes, mood }) {
  const closed = (x) => <path key={x} d={`M${x - 4},56 Q${x},51 ${x + 4},56`} fill="none" {...line} strokeWidth="2.4" />;
  const open = (x) => (
    <g key={x}>
      <circle cx={x} cy="55" r={eyes === "decides" ? 2.3 : 2.7} fill={NIGHT} />
      <circle cx={x + 0.9} cy="54" r=".8" fill={CARD} />
    </g>
  );
  // Pas content : la paupière cache le haut de l'œil
  const lidded = (x) => (
    <g key={x}>
      <path d={`M${x - 2.7},55 A2.7,2.7 0 0 0 ${x + 2.7},55 Z`} fill={NIGHT} />
      <path d={`M${x - 3.8},54.6 H${x + 3.8}`} {...line} />
    </g>
  );
  // Yeux gauche puis droit ; clin d'œil = l'œil gauche fermé
  const [left, right] = eyes === "rieurs" ? [closed, closed] : eyes === "clin" ? [closed, open] : eyes === "pas-content" ? [lidded, lidded] : [open, open];
  return (
    <>
      <circle cx="45" cy="63" r="3.6" fill={FLUO} opacity=".35" />
      <circle cx="75" cy="63" r="3.6" fill={FLUO} opacity=".35" />
      {left(51)}
      {right(69)}
      {eyes === "decides" && <path d="M45,48 L55,50 M75,48 L65,50" {...line} />}
      {eyes === "pas-content" && <path d="M45,47 L55,51 M75,47 L65,51" {...line} />}
      {/* Pas content : il boude même après une bonne partie */}
      {mood === "sad" ? (
        <path d="M53,70 Q60,63 67,70" fill="none" {...line} />
      ) : eyes === "pas-content" ? (
        <path d="M55,69.5 Q60,66 65,69.5" fill="none" {...line} />
      ) : mood === "neutral" ? (
        <path d="M54,67 Q60,69 66,67" fill="none" {...line} />
      ) : (
        <path d="M51,65 Q60,76 69,65 Z" fill={NIGHT} {...line} />
      )}
    </>
  );
}

/* ---------- Boucles d'oreilles (lobes en 38,61 et 82,61) ---------- */
// Éclat qui scintille, chacun à son rythme (k) ; immobile si l'utilisateur réduit les animations.
const twinkle = (k) => ({ className: "motion-safe:animate-twinkle", style: { animationDelay: `${-k * 0.35}s` } });

function Earrings({ id }) {
  // s : −1 à gauche, 1 à droite, pour décaler vers l'extérieur du visage
  const pair = (render) => <>{render(38, -1)}{render(82, 1)}</>;
  // Anneau cerclé d'encre qui pend sous le lobe, en dehors du visage
  const hoop = (color) =>
    pair((x, s) => (
      <g key={x}>
        <circle cx={x + s * 2.4} cy="64.5" r="4.5" fill="none" stroke={NIGHT} strokeWidth="3.4" />
        <circle cx={x + s * 2.4} cy="64.5" r="4.5" fill="none" stroke={color} strokeWidth="1.8" />
      </g>
    ));
  switch (id) {
    case "hoops":
      return hoop(SUN);
    case "silver-hoops":
      return hoop("#d3d8de");
    case "pearls":
      return pair((x) => <circle key={x} cx={x} cy="64" r="3.4" fill={CARD} {...thin} />);
    // Petit globe de bureau : océan, deux continents, reflet, monture dorée accrochée au lobe
    case "globes":
      return pair((x, s) => {
        const c = x + s * 2;
        return (
          <g key={x}>
            <path d={`M${c - 6},67.5 A6,6 0 0 1 ${c + 6},67.5 M${c},61.5 V59.6`} fill="none" stroke={SUN} strokeWidth="1.3" strokeLinecap="round" />
            <circle cx={c} cy="67.5" r="4.6" fill={INK} {...thin} />
            <path d={`M${c - 3.4},66 q1.2,-2.2 3.1,-1.7 q.5,1.4 -.9,2.4 q-1.4,.7 -2.2,-.7 Z M${c + .5},69 q1.7,-1.1 3,0 q-.3,1.8 -1.9,2.1 q-1,-.6 -1.1,-2.1 Z`} fill={LEAF} />
            <path d={`M${c - 2.6},64.8 q1,-1.3 2.5,-1.5`} fill="none" stroke={CARD} strokeWidth=".9" strokeLinecap="round" opacity=".85" />
          </g>
        );
      });
    // Petit avion vu de dessus, nez vers l'extérieur, pendu à un anneau doré
    case "planes":
      return pair((x, s) => (
        <g key={x}>
          <circle cx={x + s * 1.2} cy="61.8" r="1.5" fill="none" stroke={SUN} strokeWidth="1.1" />
          <g transform={`translate(${x + s * 3.6} 68.6) rotate(${s * 40})`}>
            <path d="M-6.2,1 L-1.3,-1.9 H1.3 L6.2,1 V2.3 L1.3,.7 H-1.3 L-6.2,2.3 Z" fill={INK} {...thin} />
            <path d="M-2.8,5.4 L-1,3.6 H1 L2.8,5.4 V6.3 H-2.8 Z" fill={FLUO} {...thin} />
            <path d="M0,-6.4 C1.2,-6.4 1.4,-4.6 1.4,-2.6 V3.4 L0,6 L-1.4,3.4 V-2.6 C-1.4,-4.6 -1.2,-6.4 0,-6.4 Z" fill={CARD} {...thin} />
            <path d="M-.6,-4.6 Q0,-5.3 .6,-4.6" fill="none" stroke={INK} strokeWidth=".8" strokeLinecap="round" />
          </g>
        </g>
      ));
    // Boule à facettes : quadrillage argenté, facettes de couleur et éclats autour qui scintillent
    case "disco":
      return pair((x, s) => {
        const c = x + s * 2;
        return (
          <g key={x}>
            <path d={`M${c},59.6 V62.4`} stroke={NIGHT} strokeWidth="1.2" />
            <circle cx={c} cy="67.6" r="5.2" fill="#b9c0ca" {...thin} />
            <path d={`M${c - 3.4},63.7 H${c + 3.4} M${c - 4.8},65.7 H${c + 4.8} M${c - 4.8},69.5 H${c + 4.8} M${c - 3.4},71.5 H${c + 3.4} M${c},62.4 V72.8 M${c - 2.6},63.2 Q${c - 3.6},67.6 ${c - 2.6},72 M${c + 2.6},63.2 Q${c + 3.6},67.6 ${c + 2.6},72`} fill="none" stroke="#7d8692" strokeWidth=".5" />
            <rect x={c - 2.6} y="64" width="2.3" height="1.5" fill={CARD} {...twinkle(0)} />
            <rect x={c + .4} y="66" width="2.2" height="1.6" fill={PINK} {...twinkle(1)} />
            <rect x={c - 2.4} y="68" width="2.1" height="1.6" fill={SUN} {...twinkle(2)} />
            <rect x={c + .6} y="69.8" width="2" height="1.4" fill="#9fd3e6" {...twinkle(3)} />
            <path d={sparkle(c + s * 7, 63.5, 2.5)} fill={SUN} {...twinkle(1.5)} />
            <path d={sparkle(c + s * 5.5, 74, 1.8)} fill={CARD} {...twinkle(2.5)} />
          </g>
        );
      });
    case "bolts":
      return pair((x) => <path key={x} d={`M${x + 1.5},59 L${x - 4},66.5 L${x + 0.5},66.5 L${x - 2.5},74 L${x + 5},64 L${x + 0.5},64 Z`} fill={SUN} {...thin} />);
    default:
      return null;
  }
}

/* ---------- Lunettes (yeux en 51,55 et 69,55) ---------- */
// Verre gauche de l'aviateur (le droit est en miroir) et écran de la visière binaire.
const AVIATOR_LENS = "M42.6,50 Q51,46.8 58,49.8 Q58.4,58.6 53.6,61.6 Q48,63.8 44.4,60.4 Q41.6,56.4 42.6,50 Z";
const VISOR = "M34,50.5 Q60,44 86,50.5 L85,60 Q60,66.5 35,60 Z";
const mirrored = (el) => <>{el}<g transform="translate(120 0) scale(-1 1)">{el}</g></>;

function Glasses({ id }) {
  const uid = useId(); // dégradés et découpe : un id par avatar
  switch (id) {
    case "round":
      return (
        <g {...line} strokeWidth="2">
          <circle cx="51" cy="55" r="7.5" fill={CARD} fillOpacity=".25" />
          <circle cx="69" cy="55" r="7.5" fill={CARD} fillOpacity=".25" />
          <path d="M58.5,55 Q60,53 61.5,55 M43.5,54 L38,52 M76.5,54 L82,52" fill="none" />
        </g>
      );
    // Lunettes de piscine : verres teintés cerclés de caoutchouc, élastique autour de la tête
    case "goggles":
      return (
        <>
          <path d="M36.5,54 L44.5,54.6 M83.5,54 L75.5,54.6" stroke={NIGHT} strokeWidth="3.6" strokeLinecap="round" />
          <path d="M36.5,54 L44.5,54.6 M83.5,54 L75.5,54.6" stroke={FLUO} strokeWidth="1.8" strokeLinecap="round" />
          {[51, 69].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="55" rx="7" ry="5.8" fill={FLUO} {...line} />
              <ellipse cx={x} cy="55" rx="4.8" ry="3.8" fill="#7fd0e8" fillOpacity=".7" {...thin} />
              <path d={`M${x - 2.8},53.8 Q${x - 1.2},52.3 ${x + 0.8},52.5`} fill="none" stroke={CARD} strokeWidth="1" strokeLinecap="round" />
            </g>
          ))}
          <path d="M58,55 Q60,53.4 62,55" fill="none" stroke={NIGHT} strokeWidth="1.8" />
        </>
      );
    // Monture dorée fine à double pont, verres dégradés (foncés en haut) avec un reflet
    case "aviators":
      return (
        <>
          <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f3b4d" />
            <stop offset="1" stopColor="#6fb3c9" />
          </linearGradient>
          {mirrored(
            <>
              <path d={AVIATOR_LENS} fill={`url(#${uid}a)`} stroke={NIGHT} strokeWidth="3" />
              <path d={AVIATOR_LENS} fill="none" stroke={SUN} strokeWidth="1.4" />
              <path d="M45.5,53.2 L49.5,50.6 M46.2,56 L47.9,54.9" stroke={CARD} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
              <path d="M42.6,51.2 L37,50.2" stroke={SUN} strokeWidth="1.4" strokeLinecap="round" />
            </>
          )}
          <path d="M57.8,49.6 Q60,48.8 62.2,49.6" fill="none" stroke={NIGHT} strokeWidth="3" />
          <path d="M57.8,49.6 Q60,48.8 62.2,49.6 M58.2,52.4 Q60,51.4 61.8,52.4" fill="none" stroke={SUN} strokeWidth="1.3" />
        </>
      );
    case "hearts": {
      const heart = (dx) => `M${51 + dx},62 C${42 + dx},56 ${43 + dx},48 ${48 + dx},48 C${50 + dx},48 ${51 + dx},49.5 ${51 + dx},51 C${51 + dx},49.5 ${52 + dx},48 ${54 + dx},48 C${59 + dx},48 ${60 + dx},56 ${51 + dx},62 Z`;
      return (
        <g fill={FLUO} {...line} strokeWidth="1.6">
          <path d={heart(0)} />
          <path d={heart(18)} />
          <path d="M59,52 L61,52" fill="none" />
        </g>
      );
    }
    // Lunettes de star : grands verres fumés, monture dorée épaisse, un éclat
    case "star":
      return (
        <>
          {mirrored(
            <>
              <rect x="39" y="47" width="19.5" height="15.5" rx="5.5" fill="#2b2733" stroke={NIGHT} strokeWidth="4.4" />
              <rect x="39" y="47" width="19.5" height="15.5" rx="5.5" fill="none" stroke={SUN} strokeWidth="2.4" />
              <path d="M42.6,51.6 L47,49.3 M42.9,55 L44.7,54" stroke={CARD} strokeWidth="1.2" strokeLinecap="round" opacity=".75" />
              <path d="M39,51 L35,50" stroke={SUN} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          <path d="M58.5,51 Q60,49.6 61.5,51" fill="none" stroke={SUN} strokeWidth="2.4" />
          <path d={sparkle(82, 46, 3)} fill={CARD} {...thin} />
        </>
      );
    case "pixel":
      return (
        <g fill={NIGHT}>
          <rect x="40" y="50" width="40" height="3" />
          <rect x="42" y="53" width="16" height="7" />
          <rect x="62" y="53" width="16" height="7" />
          <rect x="44" y="60" width="12" height="2" />
          <rect x="64" y="60" width="12" height="2" />
          <rect x="45" y="54" width="2.5" height="2.5" fill={CARD} />
          <rect x="65" y="54" width="2.5" height="2.5" fill={CARD} />
        </g>
      );
    case "monocle":
      return (
        <>
          <circle cx="69" cy="55" r="8" fill={CARD} fillOpacity=".3" stroke={SUN} strokeWidth="2.2" />
          <path d="M75,61 Q80,72 74,84" fill="none" stroke={SUN} strokeWidth="1.2" strokeDasharray="2 1.5" />
        </>
      );
    // Masque de ski : écran irisé qui reflète des montagnes, monture épaisse, sangle à rayures
    case "ski-mask":
      return (
        <>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={INK} />
            <stop offset=".45" stopColor="#7a5cc4" />
            <stop offset=".75" stopColor={FLUO} />
            <stop offset="1" stopColor={SUN} />
          </linearGradient>
          <path d="M26,51.5 H37 V59 H26 Z M83,51.5 H94 V59 H83 Z" fill={NIGHT} />
          <path d="M26,54 H37 M83,54 H94" stroke={FLUO} strokeWidth="1.3" />
          <path d="M26,56.6 H37 M83,56.6 H94" stroke={SUN} strokeWidth="1.3" />
          <path d="M35,49 Q60,42.5 85,49 Q87,56 84.5,63 Q72,67 64,64 Q60,61.5 56,64 Q48,67 35.5,63 Q33,56 35,49 Z" fill={CARD} {...line} />
          <path d="M38.5,51 Q60,45.5 81.5,51 Q83,56 81,61 Q71,64 64.5,61.8 Q60,59.4 55.5,61.8 Q49,64 39,61 Q37,56 38.5,51 Z" fill={`url(#${uid}s)`} {...thin} />
          <path d="M41,59.6 L46.5,54 L49.5,56.8 L53,53 L57.5,58.6 Q49,61.6 41,59.6 Z" fill={CARD} opacity=".55" />
          <path d="M44,52.2 Q52,49.2 62,49.4" fill="none" stroke={CARD} strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
          <path d={sparkle(76, 52, 2.6)} fill={CARD} />
        </>
      );
    // Visière enveloppante : des rangées de 0 et de 1 défilent derrière l'écran (motif de 24 unités, répété 4 fois)
    case "binary-visor":
      return (
        <>
          <clipPath id={`${uid}v`}>
            <path d={VISOR} />
          </clipPath>
          <path d="M30,52.5 H35 V58.5 H30 Z M85,52.5 H90 V58.5 H85 Z" fill={NIGHT} />
          <circle cx="32.5" cy="55.5" r="1" fill={LEAF} {...twinkle(0)} />
          <circle cx="87.5" cy="55.5" r="1" fill={LEAF} {...twinkle(2)} />
          <path d={VISOR} fill="#0d2418" {...line} />
          <g clipPath={`url(#${uid}v)`}>
            <g className="motion-safe:animate-bits">
              {["01101001", "10010110", "11000101"].map((bits, k) => (
                <text key={bits} x={30 - k * 8} y={53.4 + k * 4} fontSize="3.8" fontFamily="ui-monospace, monospace" fontWeight="700" fill={LEAF} opacity={k === 1 ? 1 : 0.7} textLength="96" lengthAdjust="spacingAndGlyphs">
                  {bits.repeat(4)}
                </text>
              ))}
            </g>
          </g>
          <path d={VISOR} fill="none" stroke={LEAF} strokeWidth=".8" />
          <path d="M40,51.4 Q60,47.2 80,51.4" fill="none" stroke={CARD} strokeWidth=".9" strokeLinecap="round" opacity=".35" />
        </>
      );
    default:
      return null;
  }
}

/* ---------- Chapeaux (haut du crâne vers y = 30) ---------- */
// Feuille en amande, de (x, y) vers l'angle deg (degrés, sens de l'écran), longueur len, largeur ≈ w.
const leaf = (x, y, deg, len, w) => {
  const [dx, dy] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const [mx, my] = [x + (dx * len) / 2, y + (dy * len) / 2];
  return `M${x},${y} Q${mx - dy * w},${my + dx * w} ${x + dx * len},${y + dy * len} Q${mx + dy * w},${my - dx * w} ${x},${y} Z`;
};

function Hat({ id }) {
  switch (id) {
    case "cap":
      return (
        <>
          <path d="M38,44 C37,27 48,21 60,21 C72,21 83,27 82,44 Z" fill={FLUO} {...line} />
          <path d="M60,44 C72,40 90,41 98,46 C90,50 72,50 60,48 Z" fill="#d9481a" {...line} />
          <path d="M60,22 V44" stroke={NIGHT} strokeWidth="1" opacity=".35" />
          <circle cx="60" cy="21" r="2" fill={FLUO} {...thin} />
        </>
      );
    // Calotte aussi large que la tête, bord qui tombe tout autour
    case "bob":
      return (
        <>
          <path d="M38,44 C37,29 45,22 60,22 C75,22 83,29 82,44 Z" fill={SUN} {...line} />
          <path d="M38.5,36 Q60,32 81.5,36 L82,42 Q60,38 38,42 Z" fill={INK} />
          <path d="M38,42 Q60,38 82,42 Q91,44 96,49 Q60,52 24,49 Q29,44 38,42 Z" fill={SUN} {...line} />
        </>
      );
    case "beret":
      return (
        <>
          <ellipse cx="57" cy="33" rx="26" ry="9" transform="rotate(-8 57 33)" fill="#16299e" {...line} />
          <path d="M56,24 l1,-4" stroke={NIGHT} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "beanie":
      return (
        <>
          <path d="M37,46 C36,25 48,18 60,18 C72,18 84,25 83,46 Z" fill={LEAF} {...line} />
          <path d="M44,26 Q60,20 76,26 M40,34 Q60,28 80,34" fill="none" stroke={CARD} strokeWidth="2.2" opacity=".8" />
          <path d="M35,41 Q60,35 85,41 L85,49 Q60,43 35,49 Z" fill="#008a4b" {...line} />
          <circle cx="60" cy="15" r="6" fill={CARD} {...line} />
        </>
      );
    // Calotte pincée aussi large que la tête
    case "cowboy":
      return (
        <g transform="translate(0 -4)">
          <path d="M40,45 C39,24 50,17 60,23 C70,17 81,24 80,45 Z" fill="#b07a45" {...line} />
          <path d="M40.7,34 H79.3 L80,39 H40 Z" fill={NIGHT} />
          <path d="M22,38 Q30,46 60,44 Q90,46 98,38 Q94,51 60,50 Q26,51 22,38 Z" fill="#b07a45" {...line} />
        </g>
      );
    case "flowers": {
      // Fleurs le long d'un arc sur le haut de la tête, la plus grosse au milieu, feuilles entre elles.
      const at = (t) => [37 * (1 - t) ** 2 + 120 * t * (1 - t) + 83 * t * t, 45 * (1 - t) ** 2 + 30 * t * (1 - t) + 45 * t * t];
      const blooms = [[0.04, FLUO, 4.8], [0.27, CARD, 5.4], [0.5, PINK, 6.2], [0.73, CARD, 5.4], [0.96, FLUO, 4.8]];
      return (
        <>
          {[0.15, 0.39, 0.61, 0.85].map((t, k) => {
            const [x, y] = at(t);
            const out = (Math.atan2(y - 54, x - 60) * 180) / Math.PI; // vers l'extérieur de la tête
            return <path key={t} d={leaf(x, y, out + (k % 2 ? 30 : -30), 8.5, 5)} fill={LEAF} {...thin} />;
          })}
          {blooms.map(([t, color, r], k) => {
            const [x, y] = at(t);
            const petals = [0, 1, 2, 3, 4].map((j) => {
              const a = ((k * 17 - 90 + j * 72) * Math.PI) / 180;
              return [x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62];
            });
            // Contour puis remplissage par-dessus : un seul trait autour de la fleur
            return (
              <g key={t}>
                {petals.map(([px, py], j) => <circle key={j} cx={px} cy={py} r={r * 0.55} fill={color} {...thin} />)}
                {petals.map(([px, py], j) => <circle key={`f${j}`} cx={px} cy={py} r={r * 0.55} fill={color} />)}
                <circle cx={x} cy={y} r={r * 0.36} fill={color === SUN ? FLUO : SUN} {...thin} />
              </g>
            );
          })}
        </>
      );
    }
    case "tophat":
      return (
        <>
          <rect x="44" y="4" width="32" height="32" rx="2" fill={NIGHT} {...line} />
          <rect x="44" y="26" width="32" height="5" fill={FLUO} />
          <ellipse cx="60" cy="36" rx="26" ry="5" fill={NIGHT} {...line} />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M40,40 L41,20 L50,30 L60,14 L70,30 L79,20 L80,40 Z" fill={SUN} {...line} />
          <circle cx="60" cy="31" r="2.6" fill={FLUO} {...thin} />
          <circle cx="49" cy="34" r="2" fill={INK} {...thin} />
          <circle cx="71" cy="34" r="2" fill={LEAF} {...thin} />
        </>
      );
    case "laurel": {
      // Laurier doré : une branche par côté, de la tempe au haut du front, feuilles alternées dehors / dedans
      // (degrés sur un cercle autour de la tête ; la branche de droite est celle de gauche en miroir).
      const p = (deg) => [60 + 26 * Math.cos((deg * Math.PI) / 180), 52 + 26 * Math.sin((deg * Math.PI) / 180)];
      const leaves = [166, 180.5, 195, 209.5, 224, 238.5, 253].flatMap((deg, k) => {
        const [x, y] = p(deg);
        return [leaf(x, y, deg + 58, 11.5 - k * 0.6, 4.4), leaf(x, y, deg + 122, 11.5 - k * 0.6, 4.4)];
      });
      const branch = (
        <>
          <path d={`M${p(160)} A26,26 0 0 1 ${p(260)}`} fill="none" stroke={NIGHT} strokeWidth="1.6" strokeLinecap="round" />
          {leaves.map((d, k) => <path key={k} d={d} fill={SUN} {...thin} />)}
          <path d={leaf(...p(260), 350, 7, 4)} fill={SUN} {...thin} />
        </>
      );
      return mirrored(branch);
    }
    case "pilot":
      return (
        <>
          <path d="M36,52 C34,28 46,20 60,20 C74,20 86,28 84,52 L84,60 Q80,64 78,60 L78,48 Q60,36 42,48 L42,60 Q40,64 36,60 Z" fill="#7a4e2d" {...line} />
          <path d="M38,35 H82" stroke={NIGHT} strokeWidth="3" />
          <circle cx="51" cy="34" r="6" fill="#9fd3e6" stroke={SUN} strokeWidth="2.2" />
          <circle cx="69" cy="34" r="6" fill="#9fd3e6" stroke={SUN} strokeWidth="2.2" />
        </>
      );
    // Coque blanche autour de la tête (les cheveux restent dedans), visière teintée avec un reflet, col sur le cou
    case "space-helmet":
      return (
        <>
          <path d="M29,53 a31,31 0 1,0 62,0 a31,31 0 1,0 -62,0 Z M40,58 a20,17 0 1,0 40,0 a20,17 0 1,0 -40,0 Z" fillRule="evenodd" fill="#f4f4f4" {...line} />
          <ellipse cx="60" cy="58" rx="20" ry="17" fill="#9fd3e6" fillOpacity=".15" />
          <path d="M44,52 Q47,45 55,43" fill="none" stroke={CARD} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M80,32 Q87,40 88,52" fill="none" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="60" cy="85" rx="18" ry="5" fill="#c9c9c9" {...line} />
          <circle cx="35" cy="45" r="2.6" fill={FLUO} {...thin} />
        </>
      );
    // Une canette de chaque côté (la droite est la gauche en miroir), les tuyaux descendent jusqu'à la bouche
    case "beer": {
      const tube = "M26,42 C24,56 36,69 53,68";
      const can = (
        <>
          <path d={tube} fill="none" stroke={NIGHT} strokeWidth="4" strokeLinecap="round" />
          <path d={tube} fill="none" stroke="#ffd66b" strokeWidth="2" strokeLinecap="round" />
          <rect x="30" y="30" width="8" height="5" fill={NIGHT} />
          <rect x="20" y="23" width="12" height="19" rx="2.5" fill={SUN} />
          <path d="M20,30 H32 V35 H20 Z" fill={FLUO} />
          <rect x="20" y="23" width="12" height="19" rx="2.5" fill="none" {...line} />
          <ellipse cx="26" cy="23.5" rx="5" ry="1.6" fill={DEEP} {...thin} />
        </>
      );
      return (
        <>
          {mirrored(can)}
          <path d="M37,45 C36,25 47,17 60,17 C73,17 84,25 83,45 Z" fill={INK} {...line} />
          <path d="M35,42 Q60,36 85,42 L85,47 Q60,41 35,47 Z" fill="#16299e" {...line} />
          <path d="M48,22 Q60,18 72,22" fill="none" stroke={CARD} strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
        </>
      );
    }
    default:
      return null;
  }
}

/* ---------- Compagnons (sur l'épaule droite, autour de 90, 96) ---------- */
function Pet({ id }) {
  switch (id) {
    case "parrot":
      return (
        <>
          <path d="M91,104 L97,117 L89,108 Z" fill={INK} {...thin} />
          <ellipse cx="90" cy="97" rx="7" ry="10" fill={LEAF} {...line} />
          <ellipse cx="93" cy="99" rx="4" ry="7" fill="#008a4b" {...thin} />
          <circle cx="88" cy="85" r="6" fill={FLUO} {...line} />
          <path d="M83,84 Q78,86 82,90 Z" fill={SUN} {...thin} />
          <circle cx="87" cy="84" r="1.2" fill={NIGHT} />
        </>
      );
    case "cat": {
      // Chat noir assis : grosse tête, grands yeux verts, oreilles et truffe roses. Queue en S, dans le cercle.
      const [fur, pink, tail] = ["#2b2b2b", "#f4a3b5", "M94.5,102 Q101,101 100.5,95 Q100.2,91.5 102,90"];
      return (
        <>
          <path d={tail} fill="none" stroke={NIGHT} strokeWidth="5.2" strokeLinecap="round" />
          <path d={tail} fill="none" stroke={fur} strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="88" cy="97" rx="8" ry="8.5" fill={fur} {...line} />
          <ellipse cx="84.5" cy="104" rx="2.6" ry="1.9" fill={fur} {...thin} />
          <ellipse cx="91.5" cy="104" rx="2.6" ry="1.9" fill={fur} {...thin} />
          <path d="M79.6,81 L80.2,72.5 L86,77.2 Z M96.4,81 L95.8,72.5 L90,77.2 Z" fill={fur} {...line} />
          <path d="M81.4,78.5 L81.7,75 L84.2,77 Z M94.6,78.5 L94.3,75 L91.8,77 Z" fill={pink} />
          <ellipse cx="88" cy="84.5" rx="8.8" ry="7.6" fill={fur} {...line} />
          <circle cx="82.5" cy="87.4" r="1.5" fill={pink} opacity=".5" />
          <circle cx="93.5" cy="87.4" r="1.5" fill={pink} opacity=".5" />
          {[84.4, 91.6].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="84" rx="2.3" ry="2.6" fill="#7ed957" />
              <ellipse cx={x} cy="84.3" rx="1" ry="1.7" fill={NIGHT} />
              <circle cx={x + 0.8} cy="83" r=".75" fill={CARD} />
            </g>
          ))}
          <path d="M87,87.4 H89 L88,88.5 Z" fill={pink} />
          <path d="M86.4,89.2 Q87.2,90.2 88,89 Q88.8,90.2 89.6,89.2" fill="none" stroke={CARD} strokeWidth=".7" strokeLinecap="round" opacity=".8" />
          <path d="M81.5,87 L77,86.2 M81.5,88.6 L77.2,89.4 M94.5,87 L99,86.2 M94.5,88.6 L98.8,89.4" stroke={CARD} strokeWidth=".6" strokeLinecap="round" opacity=".7" />
        </>
      );
    }
    case "gecko": {
      // Vu de dessus, accroché à l'épaule, tête vers le haut (repère local centré sur le ventre).
      // Pattes et queue : un trait encre puis le même trait vert, plus fin, par-dessus (contour fin).
      const limbs = "M-3,-4 L-8,-6 L-9,-10.5 M3,-4 L8,-6 L9,-10.5 M-3,4 L-8.5,2.5 L-10,6.5 M3,4 L8.5,2.5 L10,6.5 M0,7 C0,13 -3,15.5 -6.5,14.5 C-10,13.5 -10.5,9 -8,8.2 C-6,7.6 -5,9.2 -6.2,10.6";
      return (
        <g transform="translate(88 91) rotate(15)">
          <path d={limbs} fill="none" stroke={NIGHT} strokeWidth="5.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d={limbs} fill="none" stroke={LEAF} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {[[-9, -10.5], [9, -10.5], [-10, 6.5], [10, 6.5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.9" fill={LEAF} {...thin} />)}
          <ellipse cx="0" cy="0.5" rx="4.8" ry="8.5" fill={LEAF} {...line} />
          <ellipse cx="0" cy="-12.5" rx="5.4" ry="6" fill={LEAF} {...line} />
          {[-4, 4].map((x) => (
            <g key={x}>
              <circle cx={x} cy="-14" r="2.3" fill={SUN} {...thin} />
              <ellipse cx={x} cy="-14" rx=".6" ry="1.6" fill={NIGHT} />
            </g>
          ))}
          {[[0, -3], [-1.8, 1.5], [1.8, 4.5]].map(([x, y]) => <circle key={y} cx={x} cy={y} r="1.1" fill={FLUO} />)}
        </g>
      );
    }
    case "penguin":
      return (
        <>
          <ellipse cx="90" cy="96" rx="8.5" ry="12" fill={NIGHT} {...line} />
          <ellipse cx="89" cy="99" rx="5.5" ry="8.5" fill={CARD} />
          <circle cx="87" cy="88" r="1.8" fill={CARD} />
          <circle cx="87.3" cy="88" r=".8" fill={NIGHT} />
          <path d="M84,91 L80,92.5 L84,94 Z" fill={SUN} {...thin} />
          <path d="M85,108 h5 M91,108 h5" stroke={SUN} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "kangaroo":
      return (
        <>
          <ellipse cx="92" cy="102" rx="9" ry="11" fill="#c08550" {...line} />
          <path d="M86,82 L84,70 L89,78 Z M93,82 L94,70 L90,78 Z" fill="#c08550" {...line} />
          <ellipse cx="88" cy="86" rx="6" ry="7" fill="#c08550" {...line} />
          <circle cx="86" cy="85" r="1.2" fill={NIGHT} />
          <path d="M86,104 Q92,110 98,104" fill="#a96d3c" {...thin} />
          <circle cx="92" cy="102" r="3" fill="#c08550" {...thin} />
        </>
      );
    case "llama":
      return (
        <>
          <path d="M86,118 L86,90 Q86,80 92,80 Q98,80 98,90 L98,118 Z" fill="#efe6d2" {...line} />
          <path d="M88,82 L87,73 L91,79 Z M96,82 L97,73 L93,79 Z" fill="#efe6d2" {...line} />
          <ellipse cx="92" cy="86" rx="6" ry="6.5" fill="#efe6d2" {...line} />
          <circle cx="90" cy="85" r="1.2" fill={NIGHT} />
          <circle cx="94" cy="85" r="1.2" fill={NIGHT} />
          <path d="M86,100 H98 V108 H86 Z" fill={FLUO} {...thin} />
          <path d="M86,104 H98" stroke={SUN} strokeWidth="1.6" />
        </>
      );
    case "pigeon":
      return (
        <>
          <ellipse cx="91" cy="99" rx="8.5" ry="9.5" fill="#9aa3ad" {...line} />
          <path d="M84,92 Q91,95 97,91" fill="none" stroke="#7a5cc4" strokeWidth="3" />
          <circle cx="88" cy="86" r="6" fill="#9aa3ad" {...line} />
          <circle cx="87" cy="85" r="1.2" fill={FLUO} />
          <path d="M83,86 L79,87.5 L83,89 Z" fill="#5c5647" {...thin} />
          <rect x="74" y="86" width="8" height="6" fill={CARD} {...thin} />
          <path d="M74,86 L78,89.5 L82,86" fill="none" stroke={NIGHT} strokeWidth=".9" />
        </>
      );
    default:
      return null;
  }
}

// mood : "happy" | "neutral" | "sad". mirror : tourné vers la gauche (pour le face-à-face en duel).
// Sans title, l'avatar est décoratif (à côté d'un pseudo, dans un bouton déjà nommé…).
// Couvre-chefs que les cheveux ne doivent pas traverser, quelle que soit la coupe : on ne garde que les cheveux
// sous le bord ou le haut du chapeau (y), ou dans le casque d'astronaute ; le reste serait caché par le chapeau.
const below = (y) => <rect y={y} width="120" height={120 - y} />;
const HAIR_CLIP = { cap: below(23), bob: below(44), cowboy: below(40), tophat: below(36), pilot: below(23), beer: below(19), "space-helmet": <circle cx="60" cy="53" r="31" /> };

export default function Avatar({ look = DEFAULT_LOOK, size = 96, mood = "happy", mirror = false, className = "", title }) {
  const clip = useId();
  const hairClip = useId();
  const l = { ...DEFAULT_LOOK, ...look };
  const hatClip = HAIR_CLIP[l.hat];
  const hair = (el) => (hatClip ? <g clipPath={`url(#${hairClip})`}>{el}</g> : el);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`shrink-0 ${className}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={!title}>
      <circle cx="63" cy="63" r="57" fill={FLUO} opacity=".9" />
      <clipPath id={clip}>
        <circle cx="60" cy="60" r="57" />
      </clipPath>
      {hatClip && <clipPath id={hairClip}>{hatClip}</clipPath>}
      <g clipPath={`url(#${clip})`}>
        <g transform={mirror ? "translate(120 0) scale(-1 1)" : undefined}>
          {BACKGROUNDS[l.bg] ?? BACKGROUNDS.none}
          {hair(<HairBehind style={l.hair} color={l.hairColor} />)}
          <Top id={l.top} />
          {hair(<HairBack style={l.hair} color={l.hairColor} />)}
          <path d="M52,72 H68 V92 Q60,96 52,92 Z" fill={l.skin} {...line} />
          <circle cx="38" cy="56" r="5" fill={l.skin} {...line} />
          <circle cx="82" cy="56" r="5" fill={l.skin} {...line} />
          <ellipse cx="60" cy="54" rx="22" ry="24" fill={l.skin} {...line} />
          <Face eyes={l.eyes} mood={mood} />
          {hair(<HairFront style={l.hair} color={l.hairColor} hatted={Boolean(l.hat)} />)}
          <Earrings id={l.earrings} />
          <Glasses id={l.glasses} />
          <Hat id={l.hat} />
          <Pet id={l.pet} />
        </g>
      </g>
      <circle cx="60" cy="60" r="57" fill="none" stroke={NIGHT} strokeWidth="2.5" />
    </svg>
  );
}
