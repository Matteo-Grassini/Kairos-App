
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { ScheduleItem } from '../types';
import { 
    Sparkles, Lock, Clock, Utensils, Dumbbell, Briefcase, 
    BookOpen, ShoppingBag, Coffee, Home, Zap, Moon, Paperclip,
    Car, Bus, Footprints, Bike, MapPin, Video, Palette, Euro,
    Stethoscope, Laptop, Gamepad2, Music, Plane, GraduationCap, Mail, CheckCircle2, Circle
} from 'lucide-react';
import { playSound } from '../services/soundService';

interface TimelineProps {
  schedule: ScheduleItem[];
  summary?: string;
  isLoading?: boolean;
  onEventClick: (item: ScheduleItem) => void;
  currentDate: Date;
  onEventMove?: (id: string, newStartTime: string, newEndTime: string) => void; // New Drag Handler
}

const getTransportIcon = (mode?: string) => {
    switch(mode) {
        case 'driving': return Car;
        case 'transit': return Bus;
        case 'walking': return Footprints;
        case 'bicycling': return Bike;
        default: return Car;
    }
}

// Improved color palette with glass effect
const getEventStyle = (item: ScheduleItem, isDragging: boolean) => {
    const t = item.title.toLowerCase();
    
    // Base styles (Glassmorphism if possible)
    let base = {
        bg: 'bg-indigo-50/90 backdrop-blur-md',
        border: 'border-l-4 border-indigo-400',
        text: 'text-indigo-900',
        subtext: 'text-indigo-700',
        icon: Zap,
        isTravel: false,
        dragClass: isDragging ? 'z-50 shadow-2xl scale-[1.03] ring-2 ring-indigo-400 opacity-90 cursor-grabbing' : 'hover:scale-[1.01] hover:shadow-lg hover:z-40 cursor-grab active:cursor-grabbing'
    };

    // TRAVEL
    if (item.type === 'travel' || t.match(/spostamento|viaggio|tragitto|guida|andare a/)) {
        return {
            ...base,
            bg: 'bg-slate-100/80 backdrop-blur-sm',
            border: 'border-l-4 border-slate-300',
            text: 'text-slate-500 italic',
            subtext: 'text-slate-400',
            icon: getTransportIcon(item.transportMode),
            isTravel: true
        };
    }

    // --- STANDARD CATEGORIES ---

    if (item.category === 'meal' || t.match(/pranzo|cena|colazione|snack|mangiare/)) {
        if(t.match(/caffè|break/)) return { ...base, bg: 'bg-amber-100/90 backdrop-blur-md', border: 'border-l-4 border-amber-400', text: 'text-amber-900', subtext: 'text-amber-700', icon: Coffee };
        return { ...base, bg: 'bg-emerald-100/90 backdrop-blur-md', border: 'border-l-4 border-emerald-400', text: 'text-emerald-900', subtext: 'text-emerald-700', icon: Utensils };
    }
    
    if (item.category === 'work' || t.match(/riunione|meet|call|lavoro|ufficio/)) {
        if(t.match(/mail|scrivere/)) return { ...base, bg: 'bg-blue-100/90 backdrop-blur-md', border: 'border-l-4 border-blue-400', text: 'text-blue-900', subtext: 'text-blue-700', icon: Mail };
        return { ...base, bg: 'bg-blue-100/90 backdrop-blur-md', border: 'border-l-4 border-blue-400', text: 'text-blue-900', subtext: 'text-blue-700', icon: Briefcase };
    }
    
    if (item.category === 'workout' || t.match(/palestra|allenamento|corsa|yoga/)) {
        return { ...base, bg: 'bg-orange-100/90 backdrop-blur-md', border: 'border-l-4 border-orange-400', text: 'text-orange-900', subtext: 'text-orange-700', icon: Dumbbell };
    }
    
    if (item.category === 'study' || t.match(/studio|leggere|libro|esame/)) {
        return { ...base, bg: 'bg-violet-100/90 backdrop-blur-md', border: 'border-l-4 border-violet-400', text: 'text-violet-900', subtext: 'text-violet-700', icon: BookOpen };
    }

    if (item.type === 'fixed') {
         return { ...base, bg: 'bg-slate-100/90 backdrop-blur-sm', border: 'border-l-4 border-slate-400', text: 'text-slate-800', subtext: 'text-slate-500', icon: Lock };
    }

    return base;
};

export const Timeline: React.FC<TimelineProps> = ({ schedule, summary, isLoading, onEventClick, currentDate, onEventMove }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());

  // --- DRAG STATE ---
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0); // Y position relative to container
  const [dragOffset, setDragOffset] = useState(0); // Offset within the item
  const [dragStartTime, setDragStartTime] = useState<number | null>(null); // To calculate tap vs drag

  const HOUR_HEIGHT = 100; 
  const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;
  const SNAP_MINUTES = 15;
  const SNAP_PIXELS = SNAP_MINUTES * PIXELS_PER_MINUTE;

  // Update current time every minute for live flow
  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(timer);
  }, []);

  // Initial Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT; // Start at 7 AM
  }, []);

  // --- DRAG HANDLERS ---

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, itemId: string, originalStartMin: number) => {
      if (!onEventMove) return;
      // Prevent default to stop scrolling on mobile if we want direct drag, 
      // but usually for a list we want scroll. 
      // Strategy: Long press or handle logic. For now, direct interaction.
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const offsetY = clientY - rect.top; // Click Y relative to container
          
          // Calculate where the top of the event currently is
          const eventTop = originalStartMin * PIXELS_PER_MINUTE;
          
          setDraggingId(itemId);
          setDragOffset(offsetY - eventTop); // Store where in the card we clicked
          setDragY(eventTop); // Init position
          setDragStartTime(Date.now());
          
          playSound.click();
      }
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingId || !containerRef.current) return;
      e.preventDefault(); // Stop scrolling while dragging an item

      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();
      const rawY = clientY - rect.top;
      
      // Calculate new Top position, respecting offset
      let newY = rawY - dragOffset;
      
      // Snap to grid visually
      const snappedY = Math.round(newY / SNAP_PIXELS) * SNAP_PIXELS;
      
      // Boundaries
      const maxY = 24 * HOUR_HEIGHT - 30; // Don't drag past end of day
      const clampedY = Math.max(0, Math.min(snappedY, maxY));

      setDragY(clampedY);

      // Auto-scroll when near edges
      if (scrollRef.current) {
          const scrollRect = scrollRef.current.getBoundingClientRect();
          if (clientY < scrollRect.top + 50) {
              scrollRef.current.scrollTop -= 10;
          } else if (clientY > scrollRect.bottom - 50) {
              scrollRef.current.scrollTop += 10;
          }
      }
  };

  const handleDragEnd = () => {
      if (!draggingId || !onEventMove) {
          setDraggingId(null);
          return;
      }

      const draggedItem = schedule.find(i => i.id === draggingId);
      if (draggedItem) {
          // Calculate time from dragY
          const startMinutes = Math.round(dragY / PIXELS_PER_MINUTE);
          const duration = getMinutes(draggedItem.endTime) - getMinutes(draggedItem.startTime);
          
          const newStartH = Math.floor(startMinutes / 60);
          const newStartM = startMinutes % 60;
          
          const endMinutes = startMinutes + duration;
          const newEndH = Math.floor(endMinutes / 60);
          const newEndM = endMinutes % 60;

          // Check if time actually changed significantly (more than 1 min tolerance)
          // Also check for click vs drag (duration < 150ms is click)
          const isClick = dragStartTime && (Date.now() - dragStartTime < 150);

          if (!isClick && (newStartH < 24 && newEndH < 24 || (newEndH===24 && newEndM===0))) {
              const strStart = `${newStartH.toString().padStart(2, '0')}:${newStartM.toString().padStart(2, '0')}`;
              const strEnd = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
              
              if (strStart !== draggedItem.startTime) {
                  onEventMove(draggingId, strStart, strEnd);
                  playSound.success();
              }
          } else if (isClick) {
              // It was just a tap, trigger click handler
              onEventClick(draggedItem);
          }
      }

      setDraggingId(null);
      setDragY(0);
      setDragOffset(0);
      setDragStartTime(null);
  };

  // Attach global listeners for move/up to handle dragging outside the element
  useEffect(() => {
      if (draggingId) {
          window.addEventListener('mousemove', handleDragMove, { passive: false });
          window.addEventListener('mouseup', handleDragEnd);
          window.addEventListener('touchmove', handleDragMove, { passive: false });
          window.addEventListener('touchend', handleDragEnd);
      } else {
          window.removeEventListener('mousemove', handleDragMove);
          window.removeEventListener('mouseup', handleDragEnd);
          window.removeEventListener('touchmove', handleDragMove);
          window.removeEventListener('touchend', handleDragEnd);
      }
      return () => {
          window.removeEventListener('mousemove', handleDragMove);
          window.removeEventListener('mouseup', handleDragEnd);
          window.removeEventListener('touchmove', handleDragMove);
          window.removeEventListener('touchend', handleDragEnd);
      };
  }, [draggingId, dragY]);


  const getMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Compute Layout to handle overlaps (waterfall effect)
  const layoutItems = useMemo(() => {
      const sorted = [...schedule].sort((a, b) => {
          const startA = getMinutes(a.startTime);
          const startB = getMinutes(b.startTime);
          if (startA !== startB) return startA - startB;
          return getMinutes(b.endTime) - getMinutes(a.endTime);
      });

      return sorted.map((item, index, array) => {
          const start = getMinutes(item.startTime);
          const end = getMinutes(item.endTime);
          
          const overlappingPrevious = array.filter((prevItem, i) => {
              if (i >= index) return false; 
              const prevEnd = getMinutes(prevItem.endTime);
              return prevEnd > start;
          });

          const overlapCount = overlappingPrevious.length;
          
          return {
              ...item,
              startMin: start,
              durationMin: end - start,
              indentationLevel: overlapCount
          };
      });
  }, [schedule]);

  const isToday = useMemo(() => {
      const today = new Date();
      return currentDate.getDate() === today.getDate() &&
             currentDate.getMonth() === today.getMonth() &&
             currentDate.getFullYear() === today.getFullYear();
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full relative">
      
      {summary && (
        <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 p-3 lg:p-4 sticky top-0 z-30 shadow-sm shrink-0">
            <div className="flex gap-4 items-start max-w-3xl mx-auto">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl mt-0.5">
                    <Sparkles size={18} />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Strategia AI</h4>
                    <p className="text-xs lg:text-sm font-medium text-slate-700 leading-relaxed">{summary}</p>
                </div>
            </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative custom-scrollbar scroll-smooth">
        <div ref={containerRef} className="relative w-full py-10" style={{ height: 24 * HOUR_HEIGHT }}> 
          
          {/* Background Grid & Time Markers */}
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="absolute w-full flex pointer-events-none group" style={{ top: i * HOUR_HEIGHT }}>
              <div className="w-[45px] lg:w-[60px] text-right pr-2 lg:pr-4 -mt-3 select-none sticky left-0 z-10 bg-[#F5F5F7]/80 dark:bg-slate-900/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
                <span className="text-[10px] lg:text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                    {i.toString().padStart(2, '0')}:00
                </span>
              </div>
              <div className="flex-1 h-px bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
            </div>
          ))}

          {/* Current Time Indicator (Animated) */}
          {isToday && (
            <div 
                className="absolute left-0 right-0 z-50 flex items-center pointer-events-none transition-all duration-1000 ease-linear"
                style={{ top: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE }}
            >
                <div className="w-[45px] lg:w-[60px] text-right pr-2">
                    <span className="text-[9px] font-bold text-white bg-red-500 px-1 py-0.5 rounded-md shadow-sm">
                        {now.getHours()}:{now.getMinutes().toString().padStart(2,'0')}
                    </span>
                </div>
                <div className="flex-1 h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] relative">
                    <div className="absolute -left-1 -top-[3px] w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                </div>
            </div>
          )}

          {/* Events Blocks */}
          {layoutItems.map((item) => {
            const isDragging = draggingId === item.id;
            
            // If dragging, use the dragY state, else use calculated top
            const top = isDragging ? dragY : item.startMin * PIXELS_PER_MINUTE;
            const height = Math.max(item.durationMin * PIXELS_PER_MINUTE, 40); 
            
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
            const baseLeftOffset = isMobile ? 45 : 60;
            const indentStep = isMobile ? 10 : 20;

            const leftOffset = baseLeftOffset + (item.indentationLevel * indentStep); 
            const width = `calc(100% - ${leftOffset + 10}px)`; 
            
            const style = getEventStyle(item, isDragging);
            const Icon = style.icon;

            return (
              <div
                key={item.id}
                onMouseDown={(e) => handleDragStart(e, item.id, item.startMin)}
                onTouchStart={(e) => handleDragStart(e, item.id, item.startMin)}
                // Click is handled in DragEnd for logic consistency
                className={`absolute rounded-xl overflow-hidden transition-all duration-300 border-l-4 ${style.bg} ${style.border} ${style.dragClass}`}
                style={{ 
                    top: `${top}px`, 
                    height: `${height - 2}px`, 
                    left: `${leftOffset}px`,
                    width: width,
                    zIndex: isDragging ? 100 : 10 + item.indentationLevel 
                }}
              >
                <div className="flex flex-col h-full p-1.5 lg:p-2 relative z-10 pointer-events-none"> {/* Content doesn't block drag */}
                    <div className="flex items-start gap-1.5 lg:gap-2 h-full">
                        
                        {/* Icon - Hide if very short */}
                        {height > 50 && !style.isTravel && (
                            <div className={`p-1.5 rounded-lg bg-white/60 shrink-0 ${style.text}`}>
                                <Icon size={14} />
                            </div>
                        )}

                        <div className="min-w-0 flex-1">
                             <div className="flex items-center justify-between mb-0.5">
                                <span className={`text-[11px] lg:text-xs font-extrabold truncate ${style.text}`}>{item.title}</span>
                                <span className={`text-[9px] lg:text-[10px] font-bold opacity-70 ml-2 whitespace-nowrap ${style.text}`}>
                                    {isDragging ? 
                                        `${Math.floor(Math.round(dragY/PIXELS_PER_MINUTE)/60).toString().padStart(2,'0')}:${(Math.round(dragY/PIXELS_PER_MINUTE)%60).toString().padStart(2,'0')}` 
                                        : item.startTime
                                    }
                                </span>
                             </div>
                             
                             {/* Content only if enough height */}
                             {height > 60 && (
                                 <div className="flex flex-wrap gap-1 mt-1 opacity-90">
                                    {item.location && !style.isTravel && (
                                        <span className="flex items-center gap-0.5 text-[9px] font-medium bg-white/50 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[80px] lg:max-w-[100px]">
                                            <MapPin size={8} /> {item.location}
                                        </span>
                                    )}
                                    {item.cost && (
                                        <span className="flex items-center gap-0.5 text-[9px] font-bold bg-emerald-100/80 text-emerald-700 px-1.5 py-0.5 rounded">
                                            <Euro size={8} /> {item.cost}
                                        </span>
                                    )}
                                 </div>
                             )}

                             {/* Description */}
                             {height > 90 && (item.description || item.details) && (
                                <p className={`text-[9px] lg:text-[10px] mt-1 line-clamp-2 leading-tight opacity-75 ${style.subtext}`}>
                                    {item.description || item.details}
                                </p>
                             )}
                        </div>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
