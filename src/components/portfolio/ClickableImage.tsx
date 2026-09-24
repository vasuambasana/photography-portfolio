import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties } from 'react';
import Lightbox from './Lightbox';
import { ALL_FILTER, getActiveFilter } from '../../utils/filter';

interface GalleryImage {
  src: string;
  alt: string;
  title?: string;
  slug?: string;
  category?: string;
}

interface ClickableImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  width?: number;
  height?: number;
  galleryImages?: GalleryImage[];
  initialIndex?: number;
  /** Element id, used by the page transitions to find the photo. */
  id?: string;
  /** Develop duration from the photo's shutter speed; see utils/exposure.ts. */
  developMs?: number;
}

export default function ClickableImage({
  src,
  alt,
  caption,
  className = '',
  width,
  height,
  galleryImages,
  initialIndex = 0,
  id,
  developMs,
}: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [morph, setMorph] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The lightbox zooms out of the photo on the page and back into it: a same-document
  // view transition with the page image and the lightbox image sharing one name.
  const canMorph = () =>
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const open = () => {
    const img = imgRef.current;
    if (!img || !canMorph()) {
      setIsOpen(true);
      return;
    }
    img.style.viewTransitionName = 'lightbox-photo';
    const vt = document.startViewTransition(() => {
      img.style.viewTransitionName = '';
      flushSync(() => {
        setMorph(true);
        setIsOpen(true);
      });
    });
    vt.finished.finally(() => setMorph(false));
  };

  const close = () => {
    const img = imgRef.current;
    if (!img || !canMorph()) {
      setIsOpen(false);
      return;
    }
    flushSync(() => setMorph(true));
    const vt = document.startViewTransition(() => {
      flushSync(() => {
        setIsOpen(false);
        setMorph(false);
      });
      img.style.viewTransitionName = 'lightbox-photo';
    });
    vt.finished.finally(() => {
      img.style.viewTransitionName = '';
    });
  };

  // The lightbox browses whatever set the gallery filter says the visitor is in,
  // so it stays in step with the filmstrip and the prev/next links.
  const { images, idx } = useMemo(() => {
    const all = galleryImages ?? [{ src, alt, title: caption }];
    const filter = typeof window === 'undefined' ? ALL_FILTER : getActiveFilter();

    const scoped =
      filter === ALL_FILTER ? all : all.filter((img) => img.category === filter);
    const images = scoped.length > 0 ? scoped : all;

    const current = all[initialIndex]?.slug;
    const found = images.findIndex((img) => img.slug === current);

    return { images, idx: found >= 0 ? found : 0 };
  }, [galleryImages, src, alt, caption, initialIndex]);

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        id={id}
        data-develop={developMs ? '' : undefined}
        style={developMs ? ({ '--develop': `${developMs}ms` } as CSSProperties) : undefined}
        className={`cursor-zoom-in hover:opacity-90 transition-opacity ${className}`}
        onClick={open}
      />

      <Lightbox
        images={images}
        initialIndex={idx}
        isOpen={isOpen}
        onClose={close}
        transitionName={morph ? 'lightbox-photo' : undefined}
      />
    </>
  );
}
