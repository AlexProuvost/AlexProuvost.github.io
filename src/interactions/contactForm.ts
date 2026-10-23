import { gsap, ScrollTrigger } from '@/motion/gsap';
import { getLenis } from '@/motion/loop';
import { initPicks } from './picks';

/**
 * Formulaire de contact en lettre à trous (components/sections/contact/ContactForm.tsx).
 *  - Arrivée : les lignes montent l'une après l'autre et les traits des blancs se tracent de gauche à droite.
 *  - Les blancs s'élargissent avec ce qu'on tape (CSS field-sizing, sinon mesuré ici) ; l'objet de l'email
 *    et la signature se remplissent en direct.
 *  - Validation en direct : la coche apparaît dès qu'un champ est bon ; une erreur ne s'affiche qu'en quittant
 *    le champ (ou à l'envoi), puis disparaît dès qu'elle est corrigée.
 *  - Brouillon : ce qui est tapé est gardé dans le navigateur (localStorage) et retrouvé au retour.
 *  - Envoi en arrière-plan (fetch → FormSubmit). Réussi : une goutte d'encre crème part du bouton, le formulaire
 *    s'efface et « Merci {prénom}. » s'écrit en grand, avec le récapitulatif. Raté : erreur avec « Réessayer ».
 *  - Bouton « Copier » de l'email (en-tête de la section).
 * Boutons « Demander un devis » des offres ([data-quote="i"]) : présélectionnent le type de projet
 * puis défilent jusqu'au formulaire.
 */

type Copy = {
  errors: Record<string, string>;
  counter: string;
  draftSaved: string;
  draftRestored: string;
  subject: string;
  successTitle: string;
  successText: string;
  labels: Record<'company' | 'website' | 'type' | 'budget' | 'deadline', string>;
};

type FieldName = 'name' | 'email' | 'company' | 'website' | 'message';
type Control = HTMLInputElement | HTMLTextAreaElement;

const DRAFT_KEY = 'alex-contact-draft-v1';
const DRAFT_MAX_AGE = 30 * 24 * 3600 * 1000;
const TEXT_FIELDS: FieldName[] = ['name', 'email', 'company', 'website', 'message'];
const CHOICES = ['type', 'budget', 'deadline'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/** « www.site.be » → « https://www.site.be » ; null si ce n'est pas une adresse plausible */
function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return '';
  if (/\s/.test(v)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    if (!/^[^.]+(\.[^.]+)*\.[a-z]{2,}$/i.test(url.hostname)) return null;
    return url.href.replace(/\/$/, '');
  } catch {
    return null;
  }
}

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
      case 'website':
        return normalizeUrl(v) === null ? copy.errors.website : '';
      case 'message':
        if (!v) return copy.errors.message;
        return v.length >= msgMin ? '' : fill(copy.errors.messageShort, { min: String(msgMin) });
      default:
        return '';
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
  const select = (name: (typeof CHOICES)[number]) => form.elements.namedItem(name) as HTMLSelectElement | null;
  const readValues = () => {
    const d: Record<string, string> = {};
    TEXT_FIELDS.forEach((n) => (d[n] = control(n)?.value ?? ''));
    CHOICES.forEach((n) => (d[n] = select(n)?.value ?? ''));
    return d;
  };

  /* ── La lettre : largeur des blancs, objet et signature en direct ── */
  const fieldSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');
  const measure = document.createElement('canvas').getContext('2d');
  const autosize = () => {
    if (fieldSizing || !measure) return;
    form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-autosize]').forEach((el) => {
      const text =
        el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.text ?? '') : el.value || el.placeholder || ' ';
      const cs = getComputedStyle(el);
      // Le texte indicatif est en italique serif (voir ContactForm.module.css)
      const ph = el instanceof HTMLInputElement && !el.value;
      measure.font = ph
        ? `italic 400 ${cs.fontSize} ${cs.getPropertyValue('--ff-serif')}`
        : `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      el.style.width = `${Math.ceil(measure.measureText(text).width + pad + 4)}px`;
    });
  };
  const picks = initPicks(form, reduced);
  const letterSubject = form.querySelector<HTMLElement>('[data-letter-subject]');
  const signature = form.querySelector<HTMLElement>('[data-signature]');
  const refreshLetter = () => {
    picks.sync();
    const name = control('name')?.value.trim() ?? '';
    if (letterSubject)
      letterSubject.textContent = fill(copy.subject, { type: select('type')?.value ?? '', name: name || '…' });
    if (signature) {
      signature.textContent = name || (signature.dataset.placeholder ?? '');
      signature.toggleAttribute('data-empty', !name);
    }
    autosize();
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
    refreshLetter();
    draftNote?.removeAttribute('data-show');
  };
  const restoreDraft = () => {
    const d = storage.get();
    if (!d) return;
    TEXT_FIELDS.forEach((n) => {
      const el = control(n);
      if (el && typeof d[n] === 'string') el.value = d[n];
    });
    CHOICES.forEach((n) => {
      const el = select(n);
      if (el && [...el.options].some((o) => o.value === d[n])) el.value = d[n];
    });
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
    if (recap) {
      const rows: [string, string][] = [
        [copy.labels.type, d.type],
        [copy.labels.budget, d.budget],
        [copy.labels.deadline, d.deadline],
        [copy.labels.company, d.company.trim()],
        [copy.labels.website, d.website],
      ];
      recap.innerHTML = rows
        .filter(([, v]) => v)
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`)
        .join('');
    }

    const swap = () => {
      form.hidden = true;
      success.hidden = false;
      // Le formulaire est vidé une fois remplacé
      form.reset();
      resetStates();
      updateMessage();
      refreshLetter();
    };
    const reveal = () => {
      success.focus({ preventScroll: true });
      if (reduced) return;
      gsap
        .timeline()
        .from(success.querySelector('[data-success-line]'), { yPercent: 110, duration: 1.3, ease: 'expo.out' }, 0)
        .from(
          success.querySelectorAll('[data-success-item]'),
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

    // Goutte d'encre crème depuis le bouton, puis le formulaire s'efface par blocs
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
    d.website = normalizeUrl(d.website) ?? '';
    if (subject) subject.value = fill(copy.subject, { type: d.type, name: d.name.trim() });

    const payload: Record<string, string> = {};
    new FormData(form).forEach((v, k) => {
      if (typeof v === 'string' && k !== '_honey') payload[k] = v.trim();
    });
    payload.website = d.website;
    (['company', 'website'] as const).forEach((k) => {
      if (!payload[k]) delete payload[k];
    });

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
    else refreshLetter();
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

  // Offres → formulaire, type de projet présélectionné
  const onQuote = (e: Event) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>('[data-quote]');
    if (!link) return;
    e.preventDefault();
    if (form.hidden) showForm();
    const option = form.querySelector<HTMLOptionElement>(`[data-type-index="${link.dataset.quote}"]`);
    if (option) option.selected = true;
    refreshLetter();
    saveDraft();
    scrollToEl(form, 140, 1.6, () => control('name')?.focus({ preventScroll: true }));
  };

  /* ── Arrivée : les champs montent, leurs traits se tracent ── */
  let enter: ScrollTrigger | null = null;
  if (!reduced) {
    const items = form.querySelectorAll('[data-form-in]');
    const rules = form.querySelectorAll('[data-form-rule]');
    gsap.set(items, { y: 40, autoAlpha: 0 });
    gsap.set(rules, { scaleX: 0 });
    const tl = gsap
      .timeline({ paused: true })
      .to(items, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.07, ease: 'expo.out' }, 0)
      .to(rules, { scaleX: 1, duration: 1.4, stagger: 0.08, ease: 'expo.inOut' }, 0.15);
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
  refreshLetter();
  // Les largeurs mesurées dépendent des polices et de la taille du texte (clamp)
  document.fonts?.ready.then(autosize);
  window.addEventListener('resize', autosize);

  form.addEventListener('submit', onSubmit);
  form.addEventListener('input', onInput);
  form.addEventListener('change', onInput);
  form.addEventListener('focusout', onBlur);
  form.addEventListener('animationend', onAnimEnd);
  card.addEventListener('click', onClick);
  document.addEventListener('click', onQuote);
  return () => {
    enter?.kill();
    picks.destroy();
    copyBtn?.removeEventListener('click', onCopy);
    window.removeEventListener('resize', autosize);
    window.clearTimeout(copyTimer);
    window.clearTimeout(saveTimer);
    window.clearTimeout(noteTimer);
    form.removeEventListener('submit', onSubmit);
    form.removeEventListener('input', onInput);
    form.removeEventListener('change', onInput);
    form.removeEventListener('focusout', onBlur);
    form.removeEventListener('animationend', onAnimEnd);
    card.removeEventListener('click', onClick);
    document.removeEventListener('click', onQuote);
  };
}
