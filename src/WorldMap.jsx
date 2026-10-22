import { geoCentroid } from "d3-geo";
import { pointer, select } from "d3-selection";
import "d3-transition"; // ajoute selection.transition() pour les zooms animés
import { zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import { motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import { MAP_H, MAP_W } from "./geo.js";

const FILL = { leaf: "fill-leaf", ink: "fill-ink", fluo: "fill-fluo" };
const PIN = "M0 0C-7-10-11-15-11-21a11 11 0 1 1 22 0c0 6-4 11-11 21z";

// Fond de carte : calculé une fois, jamais re-rendu pendant le zoom (seul le <g> parent bouge).
const Land = memo(function Land({ map }) {
  return map.world.features.map((f) => (
    <path key={f.id} data-code={f.id} d={map.path(f)} vectorEffect="non-scaling-stroke" className="fill-paper-deep stroke-night/60 [stroke-width:0.6] hover:fill-[#dcd2b8]" />
  ));
});

function Pin() {
  return (
    <>
      <path d={PIN} transform="translate(2.5 2.5)" className="fill-fluo" />
      <path d={PIN} className="fill-ink stroke-night [stroke-width:1.5]" />
      <circle cy={-21} r={4.5} className="fill-paper" />
    </>
  );
}

// Carte vierge : clic/tap = épingle, molette/pincer = zoom. Après réponse : pays révélé, écart tracé, cadrage animé.
export default function WorldMap({ map, target, pin, onPin, result, tone, onReady }) {
  const svgRef = useRef(null);
  const behavior = useRef(null);
  const [t, setT] = useState(zoomIdentity);
  // Téléphone : cadre presque carré (bandes d'océan en haut et en bas) pour voir plus grand une fois zoomé.
  const [pad] = useState(() => (window.matchMedia("(max-width: 639px)").matches ? 180 : 0));
  // Unités SVG par pixel écran : l'épingle et les repères gardent la même taille quel que soit l'écran.
  const [unit, setUnit] = useState(1);
  const country = map.byCode.get(target.code);
  const go = (transform, ms = 700) => select(svgRef.current).transition().duration(ms).call(behavior.current.transform, transform);

  useEffect(() => {
    const svg = select(svgRef.current);
    behavior.current = zoom()
      .scaleExtent([1, 40])
      .translateExtent([[0, -pad], [MAP_W, MAP_H + pad]])
      .on("zoom", (e) => setT(e.transform));
    svg.call(behavior.current).on("dblclick.zoom", null); // un double-tap pose l'épingle, il ne zoome pas
    const ro = new ResizeObserver(([entry]) => setUnit(MAP_W / entry.contentRect.width));
    ro.observe(svgRef.current);
    return () => {
      svg.on(".zoom", null);
      ro.disconnect();
    };
  }, []);

  // Nouvelle question : retour à la vue monde, le chrono peut partir.
  useEffect(() => {
    go(zoomIdentity, 500);
    onReady();
  }, [target]);

  // Correction : cadre le pays et l'épingle pour montrer l'écart.
  useEffect(() => {
    if (!result) return;
    let [[x0, y0], [x1, y1]] = map.path.bounds(country);
    if (result.pin) {
      const [px, py] = map.projection(result.pin);
      [x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
    }
    const k = Math.min(8, Math.max(1, 0.7 / Math.max((x1 - x0) / MAP_W, (y1 - y0) / (MAP_H + 2 * pad))));
    go(zoomIdentity.translate(MAP_W / 2, MAP_H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
  }, [result]);

  const place = (e) => {
    if (result) return;
    const ll = map.projection.invert(zoomTransform(svgRef.current).invert(pointer(e.nativeEvent, svgRef.current)));
    if (ll && Number.isFinite(ll[0]) && Math.abs(ll[0]) <= 180 && Math.abs(ll[1]) <= 90) onPin(ll);
  };
  const zoomBy = (f) => select(svgRef.current).transition().duration(300).call(behavior.current.scaleBy, f);

  const tiny = result && map.path.area(country) < 4; // micro-pays : un cercle pour le repérer
  // Centre calculé sur le globe : juste même pour un archipel à cheval sur l'antiméridien (Kiribati).
  const [cx, cy] = tiny ? map.projection(geoCentroid(country)) : [0, 0];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 ${-pad} ${MAP_W} ${MAP_H + 2 * pad}`}
        onClick={place}
        role="img"
        aria-label="Carte du monde sans noms : touche l'emplacement du pays"
        className="block h-auto w-full cursor-crosshair touch-none select-none"
      >
        <defs>
          <pattern id="mer" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.1" className="fill-ink/20" />
          </pattern>
        </defs>
        <rect y={-pad} width={MAP_W} height={MAP_H + 2 * pad} fill="url(#mer)" />
        <g transform={t.toString()}>
          <Land map={map} />
          {result && <path d={map.path(country)} vectorEffect="non-scaling-stroke" className={`${FILL[tone]} stroke-night [stroke-width:1]`} />}
          {tiny && <circle cx={cx} cy={cy} r={(16 * unit) / t.k} vectorEffect="non-scaling-stroke" className="fill-none stroke-fluo [stroke-width:2.5]" />}
          {result?.km > 0 && (
            <path
              d={map.path({ type: "LineString", coordinates: [result.pin, result.nearest] })}
              vectorEffect="non-scaling-stroke"
              className="fill-none stroke-night [stroke-dasharray:5_5] [stroke-width:2]"
            />
          )}
          {pin && (
            <g transform={`translate(${map.projection(pin)}) scale(${(0.85 * unit) / t.k})`}>
              <motion.g key={pin.join()} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 22 }}>
                <Pin />
              </motion.g>
            </g>
          )}
        </g>
      </svg>
      {/* En bas à gauche : océan Pacifique sud, les boutons ne cachent aucune terre */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        {[["M5 12h14M12 5v14", 2, "Zoomer"], ["M5 12h14", 0.5, "Dézoomer"]].map(([d, f, aria]) => (
          <button
            key={aria}
            type="button"
            aria-label={aria}
            onClick={() => zoomBy(f)}
            className="grid size-9 cursor-pointer place-items-center rounded-full border-2 border-night bg-paper text-ink shadow-print-sm transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-fluo"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
              <path d={d} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
