/**
 * La section en cours (01 → 06) et sa progression, écrites par le rail de défilement (interactions/scrollRail.ts).
 */
export type Track = { number: string; label: string };

export const trackState = {
  tracks: [] as Track[],
  index: 0,
  /** Avancement dans la piste en cours (0 → 1) */
  progress: 0,
};
