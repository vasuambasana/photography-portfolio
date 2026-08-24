import { useState } from 'react';
import Lightbox from './Lightbox';

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
  slug?: string;
}

interface ClickableImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  galleryImages?: GalleryImage[];
  initialIndex?: number;
}

export default function ClickableImage({ 
  src, 
  alt, 
  caption, 
  className = '',
  galleryImages,
  initialIndex = 0
}: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If galleryImages is provided, use it. Otherwise, fallback to single image.
  const images = galleryImages || [{ src, alt, caption }];

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`cursor-zoom-in hover:opacity-90 transition-opacity ${className}`}
        onClick={() => setIsOpen(true)}
      />

      <Lightbox
        images={images}
        initialIndex={initialIndex}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
