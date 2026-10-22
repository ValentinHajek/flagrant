import { geoContains, geoDistance, geoInterpolate, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";

export const MAP_W = 960;
export const MAP_H = 540;
const EARTH_KM = 6371;

export const fmtKm = (km) => `${km.toLocaleString("fr-FR")} km`;

// Carte TopoJSON (public/data/world.json) → pays GeoJSON indexés par code ISO + projection calée sur le cadre.
export function parseWorld(topo) {
  const world = feature(topo, topo.objects.countries);
  const projection = geoNaturalEarth1().fitExtent([[10, 10], [MAP_W - 10, MAP_H - 10]], world);
  return { world, projection, path: geoPath(projection), byCode: new Map(world.features.map((f) => [f.id, f])) };
}

const rings = (g) => (g.type === "Polygon" ? g.coordinates : g.coordinates.flat());

// Distance (km) d'un point [lon, lat] au pays : 0 s'il est dedans, sinon jusqu'à la côte ou la frontière
// la plus proche. Les longs segments (frontières rectilignes) sont échantillonnés tous les ~10 km.
export function distanceToCountry(country, p) {
  if (geoContains(country, p)) return { km: 0, nearest: p };
  let best = Infinity;
  let nearest = p;
  for (const ring of rings(country.geometry)) {
    for (let k = 1; k < ring.length; k++) {
      const a = ring[k - 1];
      const steps = Math.max(1, Math.ceil((geoDistance(a, ring[k]) * EARTH_KM) / 10));
      const along = geoInterpolate(a, ring[k]);
      for (let s = 0; s < steps; s++) {
        const v = s ? along(s / steps) : a;
        const d = geoDistance(p, v);
        if (d < best) [best, nearest] = [d, v];
      }
    }
  }
  return { km: Math.round(best * EARTH_KM), nearest };
}
