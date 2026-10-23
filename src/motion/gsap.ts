import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Point d'entrée unique de GSAP : les plugins sont enregistrés une seule fois,
 * et tout le site importe gsap / ScrollTrigger / SplitText depuis ce fichier.
 */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // Jamais de « saut » après un onglet en arrière-plan ou une frame lente
  gsap.ticker.lagSmoothing(0);
}

export { gsap, ScrollTrigger, SplitText };
