// Labs: experiments visitors can opt into on the live site. The class is set before
// first paint by MotionHead.astro; this is the switch and the helpers features use.

export const labsOn = () => document.documentElement.classList.contains('labs');

export function setLabs(on: boolean) {
  try {
    localStorage.setItem('labs', on ? 'on' : 'off');
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
  // Features set themselves up at load, so the cleanest switch is a fresh page.
  location.reload();
}

document.querySelectorAll<HTMLButtonElement>('[data-labs-off]').forEach((b) =>
  b.addEventListener('click', () => setLabs(false))
);
document.querySelectorAll<HTMLButtonElement>('[data-labs-toggle]').forEach((b) =>
  b.addEventListener('click', () => setLabs(!labsOn()))
);
