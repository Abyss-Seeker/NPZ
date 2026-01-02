import React, { useEffect, useState, useRef } from 'react';

interface TransitionLayerProps {
  type: 'intro' | 'transition';
  active: boolean;
  onAnimationComplete?: () => void;
  onSequenceEnd?: () => void;
}

type AnimState = 'idle' | 'closing' | 'closed' | 'opening';

const TransitionLayer: React.FC<TransitionLayerProps> = ({ type, active, onAnimationComplete, onSequenceEnd }) => {
  const [render, setRender] = useState(active);
  const [animState, setAnimState] = useState<AnimState>('idle');
  // For Intro specific stages
  const [introStage, setIntroStage] = useState(0);

  // Use refs for callbacks to prevent effect re-triggering
  const onCompleteRef = useRef(onAnimationComplete);
  const onEndRef = useRef(onSequenceEnd);

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
    onEndRef.current = onSequenceEnd;
  }, [onAnimationComplete, onSequenceEnd]);

  useEffect(() => {
    if (active) {
      setRender(true);

      if (type === 'transition') {
        // --- TRANSITION SEQUENCE (Faster, no spinner) ---
        
        // 1. Start Closing
        const t1 = setTimeout(() => setAnimState('closing'), 50);

        // 2. Closed (Midpoint) - Fast switch
        const t2 = setTimeout(() => {
          setAnimState('closed');
          if (onCompleteRef.current) onCompleteRef.current();
        }, 550); 

        // 3. Start Opening
        const t3 = setTimeout(() => {
          setAnimState('opening');
        }, 650);

        // 4. Cleanup
        const t4 = setTimeout(() => {
           setAnimState('idle');
           setRender(false);
           if (onEndRef.current) onEndRef.current();
        }, 1150);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };

      } else {
        // --- INTRO SEQUENCE (Keep existing style) ---
        setIntroStage(1);
        const t1 = setTimeout(() => setIntroStage(1.5), 500); 
        const t2 = setTimeout(() => setIntroStage(2), 2000); 
        const t3 = setTimeout(() => setIntroStage(3), 3500); 
        const t4 = setTimeout(() => {
            if (onCompleteRef.current) onCompleteRef.current();
            setIntroStage(4); 
        }, 4000);
        const t5 = setTimeout(() => {
            setRender(false);
            setIntroStage(0);
            if (onEndRef.current) onEndRef.current();
        }, 4500);

        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
      }
    }
  }, [active, type]);

  if (!render) return null;

  // -- CSS CLASSES FOR TRANSITION TYPE --
  const leftPanelClass = (animState === 'closing' || animState === 'closed') 
      ? 'translate-x-0' 
      : '-translate-x-full';

  const rightPanelClass = (animState === 'closing' || animState === 'closed') 
      ? 'translate-x-0' 
      : 'translate-x-full';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden font-mono text-white">
      
      {/* --- INTRO SEQUENCE --- */}
      {type === 'intro' && (
         <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
            <div className={`transition-opacity duration-300 ${introStage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
               <div className="flex flex-col items-center">
                  <div className="text-xs text-cyan-500 tracking-[0.5em] mb-2 animate-pulse">NEURAL_CONNECT...</div>
                  <div className="h-px w-64 bg-gray-800 relative">
                      <div className="absolute left-0 top-0 h-full bg-cyan-400 animate-[loadBar_2s_ease-in-out_infinite]" style={{width: '30%'}}></div>
                  </div>
               </div>
            </div>

            <div className={`absolute transition-all duration-500 transform ${introStage >= 1.5 && introStage < 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}>
                 <div className="relative w-48 h-48 border border-gray-700 flex items-center justify-center">
                    <div className="absolute inset-0 border-t-2 border-l-2 border-cyan-500 w-8 h-8"></div>
                    <div className="absolute bottom-0 right-0 border-b-2 border-r-2 border-cyan-500 w-8 h-8"></div>
                    <h1 className="text-5xl font-black italic tracking-tighter">N:P:Z</h1>
                    <div className="absolute -bottom-6 text-[10px] text-gray-500 tracking-widest">SYSTEM VERSION 1.3.0</div>
                 </div>
            </div>

            <div className={`absolute inset-0 bg-black transition-transform duration-[800ms] ease-expo ${introStage >= 3 ? 'translate-y-full' : 'translate-y-0'} ${introStage < 1 ? '-translate-y-full' : ''} z-20`}>
                <div className="absolute bottom-10 left-10 text-8xl font-black text-gray-900 select-none opacity-20">
                    LOADING
                </div>
            </div>
         </div>
      )}

      {/* --- TRANSITION SEQUENCE --- */}
      {type === 'transition' && (
         <>
            {/* Background Dimmer */}
            <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${animState === 'closed' ? 'opacity-60' : 'opacity-0'}`}></div>

            {/* Left Panel */}
            <div 
              className={`absolute top-0 left-[-10vw] w-[70vw] h-full bg-[#0f0f11] transition-transform duration-500 cubic-bezier(0.25, 1, 0.5, 1) z-50 -skew-x-12 border-r-4 border-cyan-600 shadow-[10px_0_50px_rgba(0,0,0,0.8)] ${leftPanelClass}`}
            >
               <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end skew-x-12">
                   <div className="text-6xl font-black text-white/5 tracking-tighter">TRANSIT</div>
                   <div className="text-cyan-500 text-[10px] tracking-widest mt-2 bg-cyan-900/20 px-2 py-1 border-l-2 border-cyan-500">
                      SYNC_RATE: 100%
                   </div>
               </div>
               <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-500/50"></div>
            </div>

            {/* Right Panel */}
            <div 
              className={`absolute top-0 right-[-10vw] w-[70vw] h-full bg-[#141416] transition-transform duration-500 cubic-bezier(0.25, 1, 0.5, 1) z-40 -skew-x-12 border-l-4 border-yellow-500 shadow-[-10px_0_50px_rgba(0,0,0,0.8)] ${rightPanelClass}`}
            >
               <div className="absolute left-12 bottom-20 skew-x-12">
                  <div className="flex gap-1 mb-2">
                     <div className="w-2 h-2 bg-yellow-500 animate-pulse"></div>
                     <div className="w-2 h-2 bg-yellow-500 animate-pulse delay-75"></div>
                     <div className="w-2 h-2 bg-yellow-500 animate-pulse delay-150"></div>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono tracking-widest">
                     // LOADING_RESOURCES<br/>
                     // OPTIMIZING_MEMORY
                  </div>
               </div>
            </div>
         </>
      )}

      <style>{`
        @keyframes loadBar {
           0% { left: -30%; }
           100% { left: 100%; }
        }
        .ease-expo {
           transition-timing-function: cubic-bezier(0.19, 1, 0.22, 1);
        }
      `}</style>
    </div>
  );
};

export default TransitionLayer;