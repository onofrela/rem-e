'use client';

import React, { useRef, useState, useEffect } from 'react';

interface RecipeCarouselProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const RecipeCarousel = React.forwardRef<HTMLDivElement, RecipeCarouselProps>(
  ({ children, title, className = '' }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScrollButtons = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
      checkScrollButtons();
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', checkScrollButtons);
        window.addEventListener('resize', checkScrollButtons);
        return () => {
          container.removeEventListener('scroll', checkScrollButtons);
          window.removeEventListener('resize', checkScrollButtons);
        };
      }
    }, [children]);

    const scroll = (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const cardWidth = container.querySelector('.recipe-card')?.clientWidth || 300;
      const gap = 16; // gap-4 in pixels
      const scrollAmount = (cardWidth + gap) * 2; // Scroll 2 cards at a time

      const newScrollLeft = direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    };

    return (
      <div ref={ref} className={`recipe-carousel-section ${className}`}>
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 px-4 md:px-6">
            {title}
          </h2>
        )}

        <div className="relative group">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="carousel-arrow carousel-arrow-left"
              aria-label="Anterior"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="carousel-container"
          >
            <div className="carousel-content">
              {children}
            </div>
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="carousel-arrow carousel-arrow-right"
              aria-label="Siguiente"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

RecipeCarousel.displayName = 'RecipeCarousel';
