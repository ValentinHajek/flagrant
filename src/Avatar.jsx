// Avatar en SVG, style risographie (contours encre, ombre orange décalée). Repère 120×120, tête centrée en (60, 54).
import { useId } from "react";
import { DEFAULT_LOOK } from "./items.js";

const INK = "#2340c4", FLUO = "#ff5a1e", LEAF = "#00a95c", SUN = "#f2b632", NIGHT = "#17140d";
const PAPER = "#f1ecdd", DEEP = "#e7e0cc", CARD = "#fffaf0";
const line = { stroke: NIGHT, strokeWidth: 2.2, strokeLinejoin: "round", strokeLinecap: "round" };
const thin = { ...line, strokeWidth: 1.2 };

const BODY = "M12,124 C14,100 34,89 60,89 C86,89 106,100 108,124 Z";
const CAP = "M37,52 C35,33 46,26 60,26 C75,26 85,33 83,52 C80,44 74,39 66,40 C62,36 54,35 50,38 C44,40 40,45 37,52 Z";
// Dessus du mulet : le même contour que CAP, mais avec du volume sur le crâne
const MULLET_TOP = "M37,52 C33,30 45,17 60,18 C75,17 87,30 83,52 C80,43 75,38 67,38 C63,34 55,33 50,36 C44,38 40,44 37,52 Z";

/* ---------- Fonds ---------- */
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

// hatted : un chapeau est porté, on garde un dessus plat pour qu'il ne dépasse pas du couvre-chef.
function HairFront({ style, color, hatted }) {
  const p = { fill: color, ...line };
  switch (style) {
    case "mulet":
      return <path d={hatted ? CAP : MULLET_TOP} {...p} />;
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
      return <path d={CAP} {...p} />; // court, et le dessus des cheveux mi-longs, longs et du mulet
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
  // Yeux gauche puis droit ; clin d'œil = l'œil gauche fermé
  const [left, right] = eyes === "rieurs" ? [closed, closed] : eyes === "clin" ? [closed, open] : [open, open];
  return (
    <>
      <circle cx="45" cy="63" r="3.6" fill={FLUO} opacity=".35" />
      <circle cx="75" cy="63" r="3.6" fill={FLUO} opacity=".35" />
      {left(51)}
      {right(69)}
      {eyes === "decides" && <path d="M45,48 L55,50 M75,48 L65,50" {...line} />}
      {mood === "sad" ? (
        <path d="M53,70 Q60,63 67,70" fill="none" {...line} />
      ) : mood === "neutral" ? (
        <path d="M54,67 Q60,69 66,67" fill="none" {...line} />
      ) : (
        <path d="M51,65 Q60,76 69,65 Z" fill={NIGHT} {...line} />
      )}
    </>
  );
}

/* ---------- Boucles d'oreilles (lobes en 38,61 et 82,61) ---------- */
function Earrings({ id }) {
  const pair = (render) => <>{render(38)}{render(82)}</>;
  switch (id) {
    case "hoops":
      return pair((x) => <circle key={x} cx={x} cy="66" r="5" fill="none" stroke={SUN} strokeWidth="2.4" />);
    case "pearls":
      return pair((x) => <circle key={x} cx={x} cy="64" r="3.4" fill={CARD} {...thin} />);
    case "globes":
      return pair((x) => (
        <g key={x}>
          <circle cx={x} cy="66" r="4.8" fill={INK} {...thin} />
          <ellipse cx={x} cy="66" rx="2" ry="4.8" fill="none" stroke={CARD} strokeWidth=".9" />
        </g>
      ));
    case "bolts":
      return pair((x) => <path key={x} d={`M${x + 1.5},59 L${x - 4},66.5 L${x + 0.5},66.5 L${x - 2.5},74 L${x + 5},64 L${x + 0.5},64 Z`} fill={SUN} {...thin} />);
    default:
      return null;
  }
}

/* ---------- Lunettes (yeux en 51,55 et 69,55) ---------- */
function Glasses({ id }) {
  switch (id) {
    case "round":
      return (
        <g {...line} strokeWidth="2">
          <circle cx="51" cy="55" r="7.5" fill={CARD} fillOpacity=".25" />
          <circle cx="69" cy="55" r="7.5" fill={CARD} fillOpacity=".25" />
          <path d="M58.5,55 Q60,53 61.5,55 M43.5,54 L38,52 M76.5,54 L82,52" fill="none" />
        </g>
      );
    case "aviator":
      return (
        <g stroke={SUN} strokeWidth="1.6" strokeLinejoin="round">
          <path d="M43,50 Q51,47 58,50 Q58,61 51,62 Q43,61 43,50 Z" fill="#33302a" />
          <path d="M77,50 Q69,47 62,50 Q62,61 69,62 Q77,61 77,50 Z" fill="#33302a" />
          <path d="M58,50.5 L62,50.5 M43,51 L38,50 M77,51 L82,50" fill="none" />
          <path d="M46,53 L49,51 M65,53 L68,51" stroke={CARD} strokeWidth="1.2" strokeLinecap="round" />
        </g>
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
    case "ski":
      return (
        <>
          <path d="M28,55 H36 M84,55 H92" stroke={NIGHT} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M36,49 Q60,44 84,49 L84,62 Q60,66 36,62 Z" fill={INK} {...line} />
          <path d="M42,52 Q60,48 78,52 L78,55 Q60,51 42,55 Z" fill={FLUO} opacity=".85" />
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
    case "binary":
      return (
        <>
          <rect x="37" y="48" width="46" height="14" rx="3" fill={LEAF} {...line} />
          <text x="60" y="58" textAnchor="middle" fontSize="7" fontFamily="ui-monospace, monospace" fontWeight="700" fill={NIGHT} opacity=".7">0110 1001</text>
        </>
      );
    default:
      return null;
  }
}

/* ---------- Chapeaux (haut du crâne vers y = 30) ---------- */
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
    case "bob":
      return (
        <>
          <path d="M41,40 C42,24 78,24 79,40 Z" fill={SUN} {...line} />
          <path d="M41,37 Q60,33 79,37 L79,41 Q60,37 41,41 Z" fill={INK} />
          <path d="M28,43 Q60,34 92,43 Q90,50 60,48 Q30,50 28,43 Z" fill={SUN} {...line} />
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
    case "cowboy":
      return (
        <g transform="translate(0 -4)">
          <path d="M44,38 C44,22 52,19 60,24 C68,19 76,22 76,38 Z" fill="#b07a45" {...line} />
          <path d="M44,33 H76 V38 H44 Z" fill={NIGHT} />
          <path d="M22,38 Q30,46 60,44 Q90,46 98,38 Q94,51 60,50 Q26,51 22,38 Z" fill="#b07a45" {...line} />
        </g>
      );
    case "chapka":
      return (
        <>
          <path d="M34,42 L32,64 Q36,68 41,63 L41,44 Z" fill={DEEP} {...line} />
          <path d="M86,42 L88,64 Q84,68 79,63 L79,44 Z" fill={DEEP} {...line} />
          <path d="M38,40 C38,24 48,18 60,18 C72,18 82,24 82,40 Z" fill="#7a4e2d" {...line} />
          <path d="M35,42 Q60,33 85,42 L85,47 Q60,39 35,47 Z" fill={DEEP} {...line} />
        </>
      );
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
      const leaves = Array.from({ length: 6 }, (_, k) => 200 + k * 13);
      const leaf = (deg, side) => {
        const a = (deg * Math.PI) / 180;
        const x = 60 + side * Math.cos(a) * 25;
        const y = 50 + Math.sin(a) * 25;
        return <ellipse key={`${side}${deg}`} cx={x} cy={y} rx="5" ry="2.4" transform={`rotate(${side * (deg - 90)} ${x} ${y})`} fill={LEAF} {...thin} />;
      };
      return <>{leaves.map((d) => leaf(d, 1))}{leaves.map((d) => leaf(d, -1))}<circle cx="60" cy="25" r="2" fill={SUN} {...thin} /></>;
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
    case "cat":
      return (
        <>
          <path d="M99,104 Q108,100 104,92" fill="none" stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="91" cy="102" rx="9" ry="8" fill="#2b2b2b" {...line} />
          <path d="M83,84 L84,76 L89,81 Z M97,84 L96,76 L91,81 Z" fill="#2b2b2b" {...line} />
          <circle cx="90" cy="88" r="7.5" fill="#2b2b2b" {...line} />
          <circle cx="87" cy="87" r="1.6" fill={SUN} />
          <circle cx="93" cy="87" r="1.6" fill={SUN} />
          <path d="M89,91 L90,92 L91,91" fill="none" stroke={FLUO} strokeWidth="1" />
        </>
      );
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
export default function Avatar({ look = DEFAULT_LOOK, size = 96, mood = "happy", mirror = false, className = "", title }) {
  const clip = useId();
  const l = { ...DEFAULT_LOOK, ...look };
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`shrink-0 ${className}`} role={title ? "img" : undefined} aria-label={title} aria-hidden={!title}>
      <circle cx="63" cy="63" r="57" fill={FLUO} opacity=".9" />
      <clipPath id={clip}>
        <circle cx="60" cy="60" r="57" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <g transform={mirror ? "translate(120 0) scale(-1 1)" : undefined}>
          {BACKGROUNDS[l.bg] ?? BACKGROUNDS.none}
          <HairBehind style={l.hair} color={l.hairColor} />
          <Top id={l.top} />
          <HairBack style={l.hair} color={l.hairColor} />
          <path d="M52,72 H68 V92 Q60,96 52,92 Z" fill={l.skin} {...line} />
          <circle cx="38" cy="56" r="5" fill={l.skin} {...line} />
          <circle cx="82" cy="56" r="5" fill={l.skin} {...line} />
          <ellipse cx="60" cy="54" rx="22" ry="24" fill={l.skin} {...line} />
          <Face eyes={l.eyes} mood={mood} />
          <HairFront style={l.hair} color={l.hairColor} hatted={Boolean(l.hat)} />
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
