import { useState, useEffect, useCallback, useRef } from 'react';

interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
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

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
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
  }, [isOpen, goNext, goPrev, onClose]);

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

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${current.alt}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-main/95 backdrop-blur-md"
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        ref={closeButtonRef}
        onClick={onClose}
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
      <div className="relative z-0 max-w-[90vw] max-h-[85vh] flex flex-col items-center">
        <img
          src={current.src}
          alt={current.alt}
          className={`max-w-full max-h-[80vh] object-contain ${
            prefersReducedMotion ? '' : 'transition-opacity duration-300'
          }`}
          style={{ userSelect: 'none' }}
        />

        {/* Caption and counter */}
        <div className="mt-4 text-center">
          {current.caption && (
            <p className="text-sm text-zinc-400 mb-2">{current.caption}</p>
          )}
          {images.length > 1 && (
            <p className="text-xs text-zinc-500 font-mono">
              {currentIndex + 1} / {images.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
