// Primitives de marque « risographie » (même langage visuel que Kryos).
import { motion } from "framer-motion";

const BLUE = "#2340c4";
const FLUO = "#ff5a1e";

/* ---------- Logo : un fanion, imprimé deux fois ---------- */
export function Logo({ size = 40 }) {
  const paths = (
    <>
      <path d="M26 88V14" />
      <path d="M26 18h50l-10 16 10 16H26" />
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden fill="none" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(3 3.4)" stroke={FLUO}>{paths}</g>
      <g stroke={BLUE}>{paths}</g>
    </svg>
  );
}

/* ---------- Titre à encre décalée : le ghost orange se « recale » à l'apparition ---------- */
export function InkTitle({ children, className = "", as: Tag = "h1", delay = 0 }) {
  return (
    <Tag className={`relative isolate inline-block font-display uppercase leading-[0.9] text-ink ${className}`}>
      <motion.span
        aria-hidden
        className="absolute inset-0 -z-10 text-fluo"
        initial={{ x: 14, y: 15, opacity: 0 }}
        animate={{ x: 4, y: 4.5, opacity: 1 }}
        transition={{ delay: delay + 0.15, type: "spring", stiffness: 140, damping: 14 }}
      >
        {children}
      </motion.span>
      {children}
    </Tag>
  );
}

export const Kicker = ({ children, className = "" }) => (
  <p className={`text-xs font-semibold uppercase tracking-[0.28em] text-ink ${className}`}>{children}</p>
);

/* ---------- Bouton tampon ---------- */
const STAMP = {
  primary: "bg-fluo text-white shadow-print hover:translate-x-[1.5px] hover:translate-y-[2px] hover:shadow-print-sm",
  ink: "bg-ink text-paper shadow-[4px_4.5px_0_var(--color-fluo)] hover:translate-x-[1.5px] hover:translate-y-[2px] hover:shadow-[2px_2.5px_0_var(--color-fluo)]",
  ghost: "border-[2.5px] border-ink text-ink hover:bg-ink hover:text-paper",
  link: "text-ink underline decoration-2 underline-offset-4 hover:text-fluo",
};

export function Stamp({ variant = "primary", className = "", ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96, x: 4, y: 4.5, boxShadow: "0 0 0 transparent" }}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-base uppercase tracking-[0.04em] transition-[transform,box-shadow,background-color,color] duration-150 ease-[cubic-bezier(.2,.9,.25,1)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-fluo disabled:cursor-default disabled:opacity-40 disabled:hover:translate-0 ${STAMP[variant]} ${className}`}
      {...props}
    />
  );
}

/* ---------- Tampon : la monnaie du jeu (couleur = currentColor) ---------- */
export const Tampon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden className={`shrink-0 ${className}`}>
    <circle cx="10" cy="10" r="8.2" strokeWidth="2.2" />
    <circle cx="10" cy="10" r="4.6" strokeWidth="1.5" strokeDasharray="2.2 1.6" />
  </svg>
);

/* ---------- Rosette : les badges ---------- */
export const Medal = ({ className = "size-3.5" }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <circle cx="8" cy="6" r="4.3" />
    <path d="M5.4 9.6 4.6 15 8 13l3.4 2-.8-5.4" />
  </svg>
);

/* ---------- Motifs flottants (globe, punaise, boussole, fanion) ---------- */
const MOTIFS = {
  globe: (
    <>
      <circle cx="50" cy="50" r="34" />
      <ellipse cx="50" cy="50" rx="14" ry="34" />
      <path d="M17 40h66M17 60h66" />
    </>
  ),
  pin: (
    <>
      <path d="M50 88s-26-26-26-46a26 26 0 0 1 52 0c0 20-26 46-26 46z" />
      <circle cx="50" cy="42" r="9" />
    </>
  ),
  compass: (
    <>
      <circle cx="50" cy="50" r="34" />
      <path d="M50 24l9 26-9 26-9-26z" />
    </>
  ),
  flag: (
    <>
      <path d="M26 88V14" />
      <path d="M26 18h50l-10 16 10 16H26" />
    </>
  ),
};

export const Glyph = ({ name, size = 40, color = BLUE, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    {MOTIFS[name]}
  </svg>
);

export function Motif({ name, size = 56, color = BLUE, className = "", style, float = 0 }) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={style}
      animate={{ y: [0, -18, -6, 0], rotate: [0, 6, -4, 0] }}
      transition={{ duration: 6 + float, repeat: Infinity, ease: "easeInOut", delay: float }}
    >
      <Glyph name={name} size={size} color={color} />
    </motion.div>
  );
}

/* ---------- Marquee infini ---------- */
export function Marquee({ children, duration = 40 }) {
  return (
    <div className="overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <motion.div
        className="flex w-max items-center gap-10"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10" aria-hidden>{children}</div>
      </motion.div>
    </div>
  );
}
