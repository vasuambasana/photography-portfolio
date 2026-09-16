import { useMemo, useState } from 'react';
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
}: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

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
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`cursor-zoom-in hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setIsOpen(true)}
      />

      <Lightbox
        images={images}
        initialIndex={idx}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
