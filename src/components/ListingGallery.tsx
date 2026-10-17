import React, { useState } from 'react';
import { PhotoItem } from '../types/listing';
import { Camera, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

interface ListingGalleryProps {
  photos: PhotoItem[];
  title: string;
}

export const ListingGallery: React.FC<ListingGalleryProps> = ({ photos, title }) => {
  const [mobileIndex, setMobileIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full aspect-[16/9] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
        <Camera className="w-8 h-8 mr-2" />
        <span>No photos available</span>
      </div>
    );
  }

  const openLightbox = (index: number) => {
    setModalIndex(index);
    setModalOpen(true);
  };

  return (
    <>
      {/* Mobile Swipeable / Carousel View (< md) */}
      <div className="md:hidden relative w-full aspect-[4/3] overflow-hidden rounded-2xl bg-slate-900 group">
        <img
          src={photos[mobileIndex]?.url}
          alt={`${title} photo ${mobileIndex + 1}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm tabular-nums">
          {mobileIndex + 1} / {photos.length}
        </div>

        {/* Prev / Next Mobile Touch Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setMobileIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-800 flex items-center justify-center shadow-md active:scale-90"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-slate-800 flex items-center justify-center shadow-md active:scale-90"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        <button
          onClick={() => openLightbox(mobileIndex)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
          aria-label="Expand photos"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop Photo Grid (>= md) */}
      <div className="hidden md:grid grid-cols-4 gap-3 h-[440px] rounded-2xl overflow-hidden relative">
        {/* Main large cover image (left 2 cols) */}
        <div
          onClick={() => openLightbox(0)}
          className="col-span-2 h-full cursor-pointer relative group overflow-hidden bg-slate-100"
        >
          <img
            src={photos[0]?.url}
            alt={`${title} cover`}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Secondary photos grid (right 2 cols) */}
        <div className="col-span-2 grid grid-cols-2 gap-3 h-full">
          {photos.slice(1, 5).map((photo, idx) => {
            const isLast = idx === 3 || idx === photos.length - 2;
            const remainingCount = photos.length - 5;

            return (
              <div
                key={photo.id || idx}
                onClick={() => openLightbox(idx + 1)}
                className="relative h-[214px] cursor-pointer group overflow-hidden bg-slate-100 rounded-lg"
              >
                <img
                  src={photo.url}
                  alt={`${title} thumbnail ${idx + 2}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                {/* If more than 5 photos, show count on last tile */}
                {isLast && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center font-bold text-sm backdrop-blur-[2px]">
                    <Camera className="w-5 h-5 mb-1" />
                    <span>+{remainingCount} more</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* If fewer than 5 photos, fill with subtle fallback slots */}
          {photos.length < 5 && Array.from({ length: 4 - (photos.length - 1) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-[214px] bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 text-xs">
              OwnersMarket
            </div>
          ))}
        </div>

        {/* View all photos pill button */}
        <button
          onClick={() => openLightbox(0)}
          className="absolute bottom-4 right-4 bg-white/95 text-slate-800 hover:text-black font-semibold text-xs px-3.5 py-2 rounded-xl shadow-md border border-slate-200/80 backdrop-blur-md flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <Camera className="w-4 h-4 text-emerald-700" />
          <span>View all {photos.length} photos</span>
        </button>
      </div>

      {/* Lightbox Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col animate-fadeIn">
          {/* Top toolbar */}
          <div className="p-4 flex items-center justify-between text-white border-b border-white/10">
            <div className="text-sm font-medium">
              {title} · <span className="tabular-nums">{modalIndex + 1} / {photos.length}</span>
            </div>
            <button
              onClick={() => setModalOpen(false)}
              className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close viewer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Active Image */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            <img
              src={photos[modalIndex]?.url}
              alt={photos[modalIndex]?.caption || title}
              referrerPolicy="no-referrer"
              className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setModalIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setModalIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Caption & Thumbnail Strip */}
          <div className="p-4 bg-black/60 border-t border-white/10 text-center">
            {photos[modalIndex]?.caption && (
              <p className="text-xs text-white/80 mb-3">{photos[modalIndex].caption}</p>
            )}
            <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-2xl mx-auto py-1">
              {photos.map((p, i) => (
                <button
                  key={p.id || i}
                  onClick={() => setModalIndex(i)}
                  className={`w-14 h-10 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                    modalIndex === i ? 'border-emerald-500 scale-105' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
