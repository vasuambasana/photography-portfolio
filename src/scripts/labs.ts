// Labs: experiments visitors can opt into on the live site. The class is set before
// first paint by MotionHead.astro; this is the switch and the helpers features use.

export const labsOn = () => document.documentElement.classList.contains('labs');

export function setLabs(on: boolean) {
  try {
    localStorage.setItem('labs', on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  // Features set themselves up at load, so the cleanest switch is a fresh page, without
  // a ?labs= in the address that would undo the choice.
  const url = new URL(location.href);
  url.searchParams.delete('labs');
  location.replace(url);
}

document.querySelectorAll<HTMLButtonElement>('[data-labs-off]').forEach((b) =>
  b.addEventListener('click', () => setLabs(false))
);
document.querySelectorAll<HTMLButtonElement>('[data-labs-toggle]').forEach((b) =>
  b.addEventListener('click', () => setLabs(!labsOn()))
);

// The "Labs on" pill steps out of the way while reading down a page, and comes back on
// the way up, so it never sits on top of the thing being read.
const pill = document.querySelector<HTMLElement>('.labs-pill');
if (pill && labsOn()) {
  let lastY = scrollY;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      if (Math.abs(y - lastY) < 6) return;
      pill.classList.toggle('labs-pill-away', y > lastY && y > 120);
      lastY = y;
    },
    { passive: true }
  );
}
