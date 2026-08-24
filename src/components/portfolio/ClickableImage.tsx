import { useState } from 'react';
import Lightbox from './Lightbox';

interface ClickableImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

export default function ClickableImage({ src, alt, caption, className = '' }: ClickableImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // We pass a single image to the lightbox
  const images = [{ src, alt, caption }];

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
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
