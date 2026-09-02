import { useState, useEffect } from 'react';
import Lightbox from './Lightbox';

interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
  slug?: string;
  category?: string;
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
  const [images, setImages] = useState<GalleryImage[]>(galleryImages || [{ src, alt, caption }]);
  const [idx, setIdx] = useState(initialIndex);

  useEffect(() => {
    if (!galleryImages) return;
    
    // Read filter from URL
    const params = new URLSearchParams(window.location.search);
    const filter = params.get('filter');
    
    let filtered = galleryImages;
    if (filter && filter !== 'all') {
      filtered = galleryImages.filter(img => img.category === filter);
    } else if (!filter) {
      // Default to the category of the current image if no filter is specified in URL
      const currentSlugMatch = window.location.pathname.match(/\/photo\/([^\/]+)/);
      if (currentSlugMatch) {
        const slug = currentSlugMatch[1];
        const currentCategory = galleryImages.find(img => img.slug === slug)?.category;
        if (currentCategory) {
          filtered = galleryImages.filter(img => img.category === currentCategory);
        }
      }
    }
    
    // If filter results in empty list, fallback to all images
    if (filtered.length === 0) filtered = galleryImages;
    
    setImages(filtered);
    
    // Find new initial index
    // We assume the current page slug matches the one we want to start with
    const currentSlugMatch = window.location.pathname.match(/\/photo\/([^\/]+)/);
    if (currentSlugMatch) {
      const slug = currentSlugMatch[1];
      const newIdx = filtered.findIndex(img => img.slug === slug);
      setIdx(newIdx >= 0 ? newIdx : 0);
    } else {
      setIdx(0);
    }
  }, [galleryImages]);

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
        initialIndex={idx}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
