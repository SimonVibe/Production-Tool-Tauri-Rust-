import { useState, useEffect, useRef, PointerEvent } from 'react';
import { hardwareAPI } from '../lib/tauriAdapter';

interface Props {
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

const COLORS = [
  { hex: '#FF0000', contrastHex: '#00FFFF' }, // Rouge
  { hex: '#00FF00', contrastHex: '#FF00FF' }, // Vert
  { hex: '#0000FF', contrastHex: '#FFFF00' }, // Bleu
  { hex: '#FFFFFF', contrastHex: '#000000' }, // Blanc
  { hex: '#000000', contrastHex: '#FFFFFF' }, // Noir
  { hex: '#374151', contrastHex: '#F3F4F6' }, // Gris foncé
  { hex: '#D1D5DB', contrastHex: '#1F2937' }, // Gris clair
];

export default function ScreenTestModal({ onClose }: Props) {
  const [colorIndex, setColorIndex] = useState<number>(0);

  // Detect touch screen capability
  const [isTouchScreen, setIsTouchScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0);
  });

  // Square properties
  const [square, setSquare] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 100 : 200,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 100 : 200,
    size: 200,
    rotation: 0,
    color: '#EAB308', // Contrast Yellow
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number }>({ x: 0, y: 0, initialX: 0, initialY: 0 });
  
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const initialPinchRef = useRef<{ dist: number, angle: number, size: number, rotation: number, centerX: number, centerY: number } | null>(null);

  const currentColor = COLORS[colorIndex];

  // Fullscreen & ESC key listener
  useEffect(() => {
    hardwareAPI.setFullScreen(true);

    if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }

    const handleExit = () => {
      hardwareAPI.setFullScreen(false);
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        handleExit();
      } else if (e.key === 'ArrowRight' || e.key === ' ' || e.code === 'Space') {
        nextColor();
      } else if (e.key === 'ArrowLeft') {
        prevColor();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      hardwareAPI.setFullScreen(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const nextColor = () => {
    setColorIndex((prev) => (prev + 1) % COLORS.length);
  };

  const prevColor = () => {
    setColorIndex((prev) => (prev - 1 + COLORS.length) % COLORS.length);
  };

  // Pointer events for the square
  const handlePointerDownCenter = (e: PointerEvent) => {
    e.stopPropagation();
    if (e.pointerType === 'touch') setIsTouchScreen(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialX: square.x,
        initialY: square.y,
      };
    } else if (pointersRef.current.size === 2) {
      isDraggingRef.current = false;
      const pts: Point[] = Array.from(pointersRef.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      initialPinchRef.current = {
        dist,
        angle,
        size: square.size,
        rotation: square.rotation,
        centerX: square.x + square.size / 2,
        centerY: square.y + square.size / 2,
      };
    }
  };

  const handlePointerMoveCenter = (e: PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1 && isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setSquare((prev) => ({
        ...prev,
        x: dragStartRef.current.initialX + dx,
        y: dragStartRef.current.initialY + dy,
      }));
    } else if (pointersRef.current.size === 2 && initialPinchRef.current) {
      const pts: Point[] = Array.from(pointersRef.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      const init = initialPinchRef.current;
      const ratio = dist / init.dist;
      const newSize = Math.max(60, Math.min(1200, Math.round(init.size * ratio)));
      const dAngle = angle - init.angle;
      const newRotation = (init.rotation + dAngle) % 360;

      setSquare((prev) => ({
        ...prev,
        size: newSize,
        x: init.centerX - newSize / 2,
        y: init.centerY - newSize / 2,
        rotation: newRotation,
      }));
    }
  };

  const handlePointerUpCenter = (e: PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    
    if (pointersRef.current.size === 1) {
      const remainingPts = Array.from(pointersRef.current.values()) as Point[];
      if (remainingPts.length > 0) {
        const pt = remainingPts[0];
        isDraggingRef.current = true;
        dragStartRef.current = {
          x: pt.x,
          y: pt.y,
          initialX: square.x,
          initialY: square.y,
        };
      }
      initialPinchRef.current = null;
    } else if (pointersRef.current.size === 0) {
      isDraggingRef.current = false;
      initialPinchRef.current = null;
    }
  };

  const handleBackgroundPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') {
      setIsTouchScreen(true);
    }
    nextColor();
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleBackgroundPointerDown}
      className="fixed inset-0 z-50 select-none overflow-hidden touch-none transition-colors duration-100 cursor-none"
      style={{ backgroundColor: currentColor.hex }}
    >
      {/* Carré tactile interactif (Affiché si écran tactile) */}
      {isTouchScreen && (
        <div
          onPointerDown={handlePointerDownCenter}
          onPointerMove={handlePointerMoveCenter}
          onPointerUp={handlePointerUpCenter}
          onPointerCancel={handlePointerUpCenter}
          className="absolute touch-none rounded-2xl shadow-2xl flex items-center justify-center border-4 border-black/80 cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{
            left: `${square.x}px`,
            top: `${square.y}px`,
            width: `${square.size}px`,
            height: `${square.size}px`,
            backgroundColor: square.color,
            transform: `rotate(${square.rotation}deg)`,
            boxShadow: `0 0 30px ${square.color}`,
          }}
        >
        </div>
      )}
    </div>
  );
}
