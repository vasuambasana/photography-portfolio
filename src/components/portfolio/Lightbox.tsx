import { useState, useEffect, useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';

interface LightboxImage {
  src: string;
  alt: string;
  title?: string;
  slug?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  /** view-transition-name for the image while it zooms in or out of the page photo. */
  transitionName?: string;
}

const SWIPE_CLOSE = 110;
const SWIPE_STEP = 70;

export default function Lightbox({ images, isOpen, onClose, initialIndex = 0, transitionName }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync currentIndex when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Respect reduced motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const goTo = useCallback((index: number) => {
    setCurrentIndex((index + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Close handler: navigate to the current photo's page if different from initial
  const handleClose = useCallback(() => {
    const currentImage = images[currentIndex];

    // If the user navigated to a different image, go to that photo's page
    if (currentIndex !== initialIndex && currentImage?.slug) {
      window.location.href = `/photo/${currentImage.slug}${window.location.search}`;
    } else {
      onClose();
    }
  }, [currentIndex, initialIndex, images, onClose]);

  // Touch: drag down to close, sideways to step through. One finger only; a two-finger
  // pinch still zooms the page as normal (touch-action: pinch-zoom).
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'touch' || drag.current) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setOffset(Math.abs(dy) > Math.abs(dx) ? { x: 0, y: Math.max(0, dy) } : { x: dx, y: 0 });
  };
  const endDrag = (e: ReactPointerEvent, cancelled = false) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const { x, y } = offset;
    setOffset({ x: 0, y: 0 });
    if (cancelled) return;
    if (y > SWIPE_CLOSE) handleClose();
    else if (x < -SWIPE_STEP) goNext();
    else if (x > SWIPE_STEP) goPrev();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, goNext, goPrev, handleClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      closeButtonRef.current?.focus();
    } else {
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = containerRef.current!.querySelectorAll<HTMLElement>(
        'button, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', trap);
    return () => document.removeEventListener('keydown', trap);
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const current = images[currentIndex];
  const dragging = offset.x !== 0 || offset.y !== 0;
  const fade = Math.min(offset.y / 400, 0.6);

  // Rendered at the end of <body>, outside the photo frame, so nothing on the page can
  // stack above it.
  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${current.alt}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-main/95 backdrop-blur-md"
      style={fade ? { backgroundColor: `rgb(var(--color-surface-main) / ${0.95 - fade})` } : undefined}
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-surface-overlay hover:opacity-80 transition-opacity text-text-primary shadow-sm"
        aria-label="Close image viewer"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 4l12 12M16 4L4 16" />
        </svg>
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-surface-overlay hover:opacity-80 transition-opacity text-text-primary shadow-sm"
          aria-label="Previous image"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-surface-overlay hover:opacity-80 transition-opacity text-text-primary shadow-sm"
          aria-label="Next image"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 4l6 6-6 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative z-0 max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        style={{ touchAction: 'pinch-zoom' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e, true)}
      >
        <img
          src={current.src}
          alt={current.alt}
          draggable={false}
          className={`max-w-full max-h-[80vh] object-contain ${
            prefersReducedMotion || dragging ? '' : 'transition-[opacity,transform] duration-300'
          }`}
          style={{
            userSelect: 'none',
            viewTransitionName: currentIndex === initialIndex ? transitionName : undefined,
            transform: dragging ? `translate(${offset.x}px, ${offset.y}px) scale(${1 - fade * 0.3})` : undefined,
          }}
        />

        {/* Caption and counter */}
        <div className="mt-4 text-center">
          {current.title && (
            <p className="text-sm text-text-secondary mb-2">{current.title}</p>
          )}
          {images.length > 1 && (
            <p className="text-xs text-text-secondary/70 font-mono">
              {currentIndex + 1} / {images.length}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
