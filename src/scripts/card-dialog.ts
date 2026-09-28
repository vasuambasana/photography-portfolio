// Labs: the dialog behind "Settings card" and "Postcard" on a photo page. Both are drawn
// in the browser (scripts/card-drawing.ts); what a visitor writes on a postcard goes into
// their own picture and nowhere else.

import type { PhotoFacts } from './viewfinder';
import {
  drawPostcardBack,
  drawPostcardFront,
  drawSettingsCard,
  fontsReady,
  loadImage,
  stackFaces,
  toBlob,
} from './card-drawing';

type Mode = 'card' | 'postcard';

export function attachCards(facts: PhotoFacts, dialog: HTMLDialogElement, openers: HTMLButtonElement[]) {
  const tabs = [...dialog.querySelectorAll<HTMLButtonElement>('[data-card-mode]')];
  const panel = (m: Mode) => dialog.querySelector<HTMLElement>(`[data-card-panel="${m}"]`)!;
  const cardImg = panel('card').querySelector('img')!;
  const postcard = dialog.querySelector<HTMLElement>('[data-postcard]')!;
  const front = postcard.querySelector<HTMLCanvasElement>('.postcard-front')!;
  const back = postcard.querySelector<HTMLCanvasElement>('.postcard-back')!;
  const message = dialog.querySelector<HTMLTextAreaElement>('[data-postcard-message]')!;
  const sides = [...dialog.querySelectorAll<HTMLButtonElement>('[data-postcard-side]')];
  const save = dialog.querySelector<HTMLAnchorElement>('[data-card-save]')!;
  const share = dialog.querySelector<HTMLButtonElement>('[data-card-share]')!;

  let mode: Mode = 'card';
  let photo: Promise<HTMLImageElement> | null = null;
  let cardUrl = '';
  let exportUrl = '';
  let file: File | null = null;
  let postcardDrawn = false;
  let pending = 0;

  const getPhoto = () => (photo ??= Promise.all([loadImage(facts.full), fontsReady()]).then(([img]) => img));

  // The picture that Save and Share hand over, for whichever mode is showing.
  async function refreshExport() {
    const blob =
      mode === 'card'
        ? await toBlob(drawSettingsCard(facts, await getPhoto()))
        : await toBlob(stackFaces(front, back));
    URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(blob);
    const name = `${facts.slug}-${mode === 'card' ? 'settings' : 'postcard'}.jpg`;
    file = new File([blob], name, { type: 'image/jpeg' });
    save.href = exportUrl;
    save.download = name;
    share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    if (mode === 'card' && !cardUrl) {
      cardUrl = URL.createObjectURL(blob);
      cardImg.src = cardUrl;
    }
  }

  async function show(next: Mode) {
    mode = next;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.cardMode === mode)));
    (['card', 'postcard'] as Mode[]).forEach((m) => (panel(m).hidden = m !== mode));
    if (mode === 'postcard' && !postcardDrawn) {
      const img = await getPhoto();
      drawPostcardFront(front, img);
      drawPostcardBack(back, facts, message.value, img);
      // The preview takes the card's own shape, the photograph's.
      postcard.style.setProperty('--ratio', String(front.width / front.height));
      postcardDrawn = true;
    }
    await refreshExport();
  }

  openers.forEach((button) =>
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await show((button.dataset.cardOpen as Mode) ?? 'card');
        if (!dialog.open) dialog.showModal();
      } finally {
        button.disabled = false;
      }
    })
  );

  tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.cardMode as Mode)));

  // Front is the photograph, back is the writing. The buttons and a tap on the card both
  // turn it over.
  const turnTo = (side: 'front' | 'back') => {
    postcard.classList.toggle('flipped', side === 'back');
    sides.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.postcardSide === side)));
  };
  sides.forEach((b) => b.addEventListener('click', () => turnTo(b.dataset.postcardSide as 'front' | 'back')));

  // Writing on the back redraws it, and turns the card over so the words can be seen.
  message.addEventListener('input', () => {
    turnTo('back');
    clearTimeout(pending);
    pending = window.setTimeout(async () => {
      drawPostcardBack(back, facts, message.value, await getPhoto());
      await refreshExport();
    }, 250);
  });

  const turn = () => turnTo(postcard.classList.contains('flipped') ? 'front' : 'back');
  postcard.addEventListener('click', turn);
  postcard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      turn();
    }
  });

  share.addEventListener('click', async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: facts.title, url: `${location.origin}/photo/${facts.slug}` });
    } catch {
      // Dismissed: nothing to do.
    }
  });

  dialog.addEventListener('click', (e) => {
    // A click on the backdrop closes it.
    if (e.target === dialog) dialog.close();
  });
}
