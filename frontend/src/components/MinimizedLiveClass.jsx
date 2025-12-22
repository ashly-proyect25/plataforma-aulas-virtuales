// frontend/src/components/MinimizedLiveClass.jsx
import { useState, useRef, useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';

const MinimizedLiveClass = ({
  course,
  onMaximize,
  onClose,
  videoRef,
  isTeacher = false
}) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Manejar inicio de arrastre
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return; // No arrastrar si se hace clic en botones
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Manejar arrastre
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Limitar dentro de la ventana
      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 220;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] bg-gray-900 rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '320px',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-2 text-white ${
        isTeacher
          ? 'bg-gradient-to-r from-red-500 to-pink-600'
          : 'bg-gradient-to-r from-cyan-500 to-blue-600'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="font-semibold text-xs">EN VIVO - {course?.code}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }}
            className="no-drag p-1 hover:bg-white/20 rounded transition"
            title="Maximizar"
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="no-drag p-1 hover:bg-white/20 rounded transition"
            title="Cerrar transmisión"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Miniatura de video */}
      <div className="w-full bg-black relative" style={{ height: '180px' }}>
        <video
          ref={videoRef}
          autoPlay={true}
          muted={isTeacher}
          playsInline={true}
          className="w-full h-full object-contain pointer-events-none"
        />
        {!videoRef?.current?.srcObject && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/70">
              <div className="animate-pulse mb-2">📹</div>
              <p className="text-xs">Conectando...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimizedLiveClass;
