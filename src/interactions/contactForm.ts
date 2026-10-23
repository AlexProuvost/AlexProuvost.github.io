import { gsap, ScrollTrigger } from '@/motion/gsap';
import { getLenis } from '@/motion/loop';

/**
 * Formulaire de contact (components/sections/contact/ContactForm.tsx) : nom, email, projet.
 *  - Arrivée : les questions montent l'une après l'autre et leurs filets se tracent de gauche à droite.
 *  - Validation en direct : la coche apparaît dès qu'un champ est bon ; une erreur ne s'affiche qu'en quittant
 *    le champ (ou à l'envoi), puis disparaît dès qu'elle est corrigée.
 *  - Brouillon : ce qui est tapé est gardé dans le navigateur (localStorage) et retrouvé au retour.
 *  - Envoi en arrière-plan (fetch → FormSubmit). Réussi : une onde part du bouton, le formulaire s'efface
 *    et « Merci {prénom}. » s'écrit en grand. Raté : erreur avec « Réessayer ».
 *  - Bouton « Copier » de l'email (en-tête de la section).
 * Boutons « Demander un devis » des offres ([data-quote="i"]) : remplissent le type de projet (champ caché,
 * repris dans l'objet de l'email et le récapitulatif) puis défilent jusqu'au formulaire.
 */

type Copy = {
  errors: Record<string, string>;
  counter: string;
  draftSaved: string;
  draftRestored: string;
  subject: string;
  successTitle: string;
  successText: string;
  typeLabel: string;
  types: string[];
};

type FieldName = 'name' | 'email' | 'message';
type Control = HTMLInputElement | HTMLTextAreaElement;

const DRAFT_KEY = 'alex-contact-draft-v2';
const DRAFT_MAX_AGE = 30 * 24 * 3600 * 1000;
const TEXT_FIELDS: FieldName[] = ['name', 'email', 'message'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

const storage = {
  get(): Record<string, string> | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as Record<string, string> & { t?: number };
      if (!d.t || Date.now() - Number(d.t) > DRAFT_MAX_AGE) return null;
      return d;
    } catch {
      return null;
    }
  },
  set(d: Record<string, unknown>) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* navigation privée : tant pis */
    }
  },
  clear() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* rien */
    }
  },
};

/** Défile jusqu'à un élément (position calculée ici : celle de Lenis peut être en retard d'un défilement natif) */
function scrollToEl(el: Element, offset: number, duration: number, done?: () => void) {
  const y = window.scrollY + el.getBoundingClientRect().top - offset;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { duration, onComplete: done });
  else {
    window.scrollTo({ top: y, behavior: 'smooth' });
    done?.();
  }
}

export function initContactForm(): () => void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  const card = form?.closest<HTMLElement>('[data-contact-card]');
  if (!form || !card) return () => {};

  const copy = JSON.parse(form.dataset.copy ?? '{}') as Copy;
  const endpoint = form.dataset.endpoint ?? form.action;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const msgMin = Number(form.querySelector('textarea')?.minLength) || 20;
  const msgMax = Number(form.querySelector('textarea')?.maxLength) || 2000;

  const summary = form.querySelector<HTMLElement>('[data-summary]');
  const failure = form.querySelector<HTMLElement>('[data-form-error]');
  const counter = form.querySelector<HTMLElement>('[data-counter]');
  const draftNote = form.querySelector<HTMLElement>('[data-draft]');
  const draftText = form.querySelector<HTMLElement>('[data-draft-text]');
  const subject = form.querySelector<HTMLInputElement>('[data-subject]');
  const typeInput = form.querySelector<HTMLInputElement>('[data-type]');
  const submitBtn = form.querySelector<HTMLElement>('[data-submit]');
  const success = card.querySelector<HTMLElement>('[data-form-success]');
  const drop = card.querySelector<HTMLElement>('[data-form-drop]');

  // La validation maison remplace les bulles du navigateur (elles restent actives sans JS)
  form.noValidate = true;

  const control = (name: FieldName) => form.elements.namedItem(name) as Control | null;
  const wrap = (el: Element) => el.closest<HTMLElement>('[data-field]');
  let submitted = false;

  /* ── Validation ── */
  const errorFor = (name: FieldName): string => {
    const v = control(name)?.value.trim() ?? '';
    switch (name) {
      case 'name':
        return v.length >= 2 ? '' : copy.errors.name;
      case 'email':
        if (!v) return copy.errors.email;
        return EMAIL_RE.test(v) ? '' : copy.errors.emailFormat;
      case 'message':
        if (!v) return copy.errors.message;
        return v.length >= msgMin ? '' : fill(copy.errors.messageShort, { min: String(msgMin) });
    }
  };

  const setState = (name: FieldName, state: 'idle' | 'valid' | 'invalid', msg = '') => {
    const el = control(name);
    const box = el && wrap(el);
    if (!el || !box) return;
    box.dataset.state = state;
    el.setAttribute('aria-invalid', String(state === 'invalid'));
    const err = box.querySelector<HTMLElement>('[data-error]');
    // En sortie d'erreur, le texte reste le temps que la ligne se replie
    if (err && state === 'invalid') err.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  };

  /** live : en tapant (on récompense tout de suite, on ne gronde qu'après avoir quitté le champ) */
  const check = (name: FieldName, mode: 'live' | 'blur' | 'force') => {
    const el = control(name);
    if (!el) return true;
    const msg = errorFor(name);
    const filled = el.value.trim() !== '';
    const wasInvalid = wrap(el)?.dataset.state === 'invalid';
    if (!msg) setState(name, filled ? 'valid' : 'idle');
    else if (mode === 'force' || wasInvalid || (mode === 'blur' && filled) || (mode === 'live' && submitted))
      setState(name, 'invalid', msg);
    else setState(name, 'idle');
    if (summary && !summary.hidden && form.querySelectorAll('[data-state="invalid"]').length === 0)
      summary.hidden = true;
    return !msg;
  };

  /* ── Message : compteur et hauteur automatique ── */
  const message = control('message') as HTMLTextAreaElement | null;
  const updateMessage = () => {
    if (!message) return;
    const n = message.value.trim().length;
    if (counter) {
      counter.textContent = fill(copy.counter, { n: String(message.value.length), max: String(msgMax) });
      counter.toggleAttribute('data-ok', n >= msgMin);
    }
    message.style.height = 'auto';
    message.style.height = `${message.scrollHeight + 1}px`;
  };

  /* ── Brouillon ── */
  let saveTimer = 0;
  let noteTimer = 0;
  const showDraft = (text: string, persist = false) => {
    if (!draftNote || !draftText) return;
    draftText.textContent = text;
    draftNote.setAttribute('data-show', '');
    window.clearTimeout(noteTimer);
    if (!persist) noteTimer = window.setTimeout(() => draftNote.removeAttribute('data-show'), 2600);
  };
  const readValues = () => {
    const d: Record<string, string> = {};
    TEXT_FIELDS.forEach((n) => (d[n] = control(n)?.value ?? ''));
    d.type = typeInput?.value ?? '';
    return d;
  };
  const saveDraft = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const d = readValues();
      if (!TEXT_FIELDS.some((n) => d[n].trim())) {
        storage.clear();
        return;
      }
      storage.set({ ...d, t: Date.now() });
      showDraft(copy.draftSaved);
    }, 500);
  };
  const resetStates = () => {
    TEXT_FIELDS.forEach((n) => setState(n, 'idle'));
    submitted = false;
    if (summary) summary.hidden = true;
    if (failure) failure.hidden = true;
  };
  const clearDraft = () => {
    storage.clear();
    form.reset();
    resetStates();
    updateMessage();
    draftNote?.removeAttribute('data-show');
  };
  const restoreDraft = () => {
    const d = storage.get();
    if (!d) return;
    TEXT_FIELDS.forEach((n) => {
      const el = control(n);
      if (el && typeof d[n] === 'string') el.value = d[n];
    });
    if (typeInput && copy.types.includes(d.type)) typeInput.value = d.type;
    // Seules les coches s'affichent au retour, pas les erreurs
    TEXT_FIELDS.forEach((n) => {
      if (control(n)?.value.trim() && !errorFor(n)) setState(n, 'valid');
    });
    showDraft(copy.draftRestored, true);
  };

  /* ── Écrans ── */
  const animateHeight = (swap: () => void) => {
    const h0 = card.offsetHeight;
    swap();
    const h1 = card.offsetHeight;
    if (reduced) {
      ScrollTrigger.refresh();
      return;
    }
    gsap.fromTo(
      card,
      { height: h0 },
      {
        height: h1,
        duration: 0.9,
        ease: 'expo.inOut',
        clearProps: 'height',
        onComplete: () => ScrollTrigger.refresh(),
      },
    );
  };

  const scrollToCard = () => {
    const top = card.getBoundingClientRect().top;
    if (top > 80 && top < window.innerHeight * 0.4) return;
    scrollToEl(card, 140, 1.2);
  };

  const showSuccess = (d: Record<string, string>) => {
    if (!success) return;
    const first = d.name.trim().split(/\s+/)[0] ?? '';
    const title = success.querySelector<HTMLElement>('[data-success-title]');
    const text = success.querySelector<HTMLElement>('[data-success-text]');
    const recap = success.querySelector<HTMLElement>('[data-recap]');
    if (title) title.textContent = fill(copy.successTitle, { name: first });
    if (text)
      text.innerHTML = escapeHtml(fill(copy.successText, { email: '\u0000' })).replace(
        '\u0000',
        `<strong>${escapeHtml(d.email.trim())}</strong>`,
      );
    // Récapitulatif : seulement s'il y a quelque chose à rappeler (le type de projet choisi depuis une offre)
    if (recap) {
      recap.innerHTML = d.type ? `<dt>${escapeHtml(copy.typeLabel)}</dt><dd>${escapeHtml(d.type)}</dd>` : '';
      if (recap.parentElement) recap.parentElement.hidden = !d.type;
    }

    const swap = () => {
      form.hidden = true;
      success.hidden = false;
      // Le formulaire est vidé une fois remplacé
      form.reset();
      resetStates();
      updateMessage();
    };
    const reveal = () => {
      success.focus({ preventScroll: true });
      if (reduced) return;
      gsap
        .timeline()
        .from(success.querySelector('[data-success-line]'), { yPercent: 110, duration: 1.3, ease: 'expo.out' }, 0)
        .from(
          success.querySelectorAll('[data-success-item]:not([hidden])'),
          { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out', clearProps: 'all' },
          0.2,
        );
    };

    if (reduced) {
      animateHeight(swap);
      reveal();
      scrollToCard();
      return;
    }

    // Onde d'encre depuis le bouton, puis le formulaire s'efface par blocs
    const tl = gsap.timeline();
    if (drop && submitBtn) {
      const cr = card.getBoundingClientRect();
      const br = submitBtn.getBoundingClientRect();
      gsap.set(drop, {
        x: br.left + br.width / 2 - cr.left,
        y: br.top + br.height / 2 - cr.top,
        scale: 0.4,
        opacity: 1,
      });
      tl.to(drop, { scale: 26, opacity: 0, borderWidth: 0.4, duration: 1.2, ease: 'expo.out' }, 0);
    }
    tl.to(
      form.querySelectorAll('[data-form-in]'),
      { y: -24, autoAlpha: 0, duration: 0.5, stagger: 0.04, ease: 'power3.in' },
      0.05,
    ).add(() => {
      gsap.set(form.querySelectorAll('[data-form-in]'), { clearProps: 'transform,opacity,visibility' });
      if (drop) gsap.set(drop, { clearProps: 'all' });
      animateHeight(swap);
      reveal();
      scrollToCard();
    });
  };

  const showForm = () => {
    if (!success) return;
    animateHeight(() => {
      success.hidden = true;
      form.hidden = false;
      form.removeAttribute('data-state');
    });
    if (!reduced)
      gsap.from(form.querySelectorAll('[data-form-in]'), {
        y: 30,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.05,
        delay: 0.2,
        ease: 'expo.out',
        clearProps: 'all',
      });
    scrollToCard();
    window.setTimeout(() => control('name')?.focus({ preventScroll: true }), reduced ? 0 : 700);
  };

  /* ── Envoi ── */
  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (form.dataset.state === 'sending') return;
    if ((form.elements.namedItem('_honey') as HTMLInputElement | null)?.value) return; // robot

    submitted = true;
    const invalid = TEXT_FIELDS.filter((n) => !check(n, 'force'));
    if (invalid.length) {
      if (summary) summary.hidden = false;
      invalid.forEach((n) => {
        const el = control(n);
        const box = el && wrap(el);
        if (!box) return;
        box.removeAttribute('data-shake');
        void box.offsetWidth;
        box.setAttribute('data-shake', '');
      });
      const first = control(invalid[0]);
      if (first) scrollToEl(first, 180, 0.9, () => first.focus({ preventScroll: true }));
      return;
    }

    const d = readValues();
    // Objet : « Nouveau projet · type · nom », sans le type s'il n'a pas été choisi
    if (subject)
      subject.value = fill(copy.subject, { type: d.type, name: d.name.trim() })
        .replace(/ · +· /, ' · ')
        .trim();

    const payload: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      if (typeof v === 'string' && k !== '_honey') payload[k] = v.trim();
    });
    if (!payload.type) delete payload.type;

    form.dataset.state = 'sending';
    if (failure) failure.hidden = true;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json().catch(() => ({}))) as { success?: string | boolean };
      if (String(json.success) === 'false') throw new Error('refused');
      form.dataset.state = 'success';
      window.clearTimeout(saveTimer);
      storage.clear();
      draftNote?.removeAttribute('data-show');
      showSuccess(d);
    } catch {
      form.dataset.state = 'error';
      if (failure) {
        failure.hidden = false;
        if (!reduced) gsap.from(failure, { autoAlpha: 0, y: 10, duration: 0.6, ease: 'expo.out', clearProps: 'all' });
      }
    } finally {
      window.clearTimeout(timer);
      ScrollTrigger.refresh();
    }
  };

  /* ── Écoutes ── */
  const onInput = (e: Event) => {
    const name = (e.target as HTMLElement).getAttribute('name') as FieldName | null;
    if (name && TEXT_FIELDS.includes(name)) check(name, 'live');
    if (name === 'message') updateMessage();
    saveDraft();
  };
  const onBlur = (e: FocusEvent) => {
    const name = (e.target as HTMLElement).getAttribute?.('name') as FieldName | null;
    if (!name || !TEXT_FIELDS.includes(name)) return;
    check(name, 'blur');
  };
  const onAnimEnd = (e: AnimationEvent) => {
    (e.target as HTMLElement).closest('[data-field]')?.removeAttribute('data-shake');
  };
  const onClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-draft-clear]')) {
      clearDraft();
      control('name')?.focus();
    } else if (target.closest('[data-form-again]')) showForm();
  };

  // Offres → formulaire, type de projet rempli
  const onQuote = (e: Event) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-quote]');
    if (!link) return;
    e.preventDefault();
    if (form.hidden) showForm();
    const type = copy.types[Number(link.dataset.quote)];
    if (typeInput && type) typeInput.value = type;
    saveDraft();
    scrollToEl(form, 140, 1.6, () => control('name')?.focus({ preventScroll: true }));
  };

  /* ── Arrivée : les questions montent, leurs filets se tracent ── */
  let enter: ScrollTrigger | null = null;
  if (!reduced) {
    const items = form.querySelectorAll('[data-form-in]');
    const rules = form.querySelectorAll('[data-form-rule]');
    gsap.set(items, { y: 40, autoAlpha: 0 });
    gsap.set(rules, { scaleX: 0 });
    const tl = gsap
      .timeline({ paused: true })
      .to(items, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.09, ease: 'expo.out' }, 0)
      .to(rules, { scaleX: 1, duration: 1.4, stagger: 0.1, ease: 'expo.inOut' }, 0.15);
    enter = ScrollTrigger.create({ trigger: form, start: 'top 85%', once: true, onEnter: () => tl.play() });
  }

  /* ── Copier l'email ── */
  const copyBtn = document.querySelector<HTMLButtonElement>('[data-copy-email]');
  const copyLabel = copyBtn?.querySelector<HTMLElement>('[data-copy-label]');
  const copyIdle = copyLabel?.textContent ?? '';
  let copyTimer = 0;
  const onCopy = async () => {
    if (!copyBtn || !copyLabel) return;
    const email = copyBtn.dataset.copyEmail ?? '';
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Ancienne méthode : un champ temporaire sélectionné
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* rien */
      }
      ta.remove();
    }
    copyLabel.textContent = copyBtn.dataset.copied ?? '✓';
    copyBtn.setAttribute('data-done', '');
    if (!reduced) gsap.fromTo(copyBtn, { scale: 0.92 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copyLabel.textContent = copyIdle;
      copyBtn.removeAttribute('data-done');
    }, 1800);
  };
  copyBtn?.addEventListener('click', onCopy);

  restoreDraft();
  updateMessage();

  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', onInput);
  form.addEventListener('focusout', onBlur);
  form.addEventListener('animationend', onAnimEnd);
  card.addEventListener('click', onClick);
  document.addEventListener('click', onQuote);
  return () => {
    enter?.kill();
    copyBtn?.removeEventListener('click', onCopy);
    window.clearTimeout(copyTimer);
    window.clearTimeout(saveTimer);
    window.clearTimeout(noteTimer);
    form.removeEventListener('submit', onSubmit);
    form.removeEventListener('input', onInput);
    form.removeEventListener('focusout', onBlur);
    form.removeEventListener('animationend', onAnimEnd);
    card.removeEventListener('click', onClick);
    document.removeEventListener('click', onQuote);
  };
}
