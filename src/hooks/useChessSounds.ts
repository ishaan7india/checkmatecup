import { useCallback, useRef } from 'react';

// Using Web Audio API for reliable cross-browser sounds
export const useChessSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [getAudioContext]);

  const playMove = useCallback(() => {
    playTone(440, 0.1, 'sine');
  }, [playTone]);

  const playCapture = useCallback(() => {
    playTone(220, 0.15, 'square');
    setTimeout(() => playTone(180, 0.1, 'square'), 50);
  }, [playTone]);

  const playCheck = useCallback(() => {
    playTone(880, 0.1, 'sine');
    setTimeout(() => playTone(660, 0.1, 'sine'), 100);
    setTimeout(() => playTone(880, 0.15, 'sine'), 200);
  }, [playTone]);

  const playCheckmate = useCallback(() => {
    [0, 100, 200, 300, 400].forEach((delay, i) => {
      setTimeout(() => playTone(440 + i * 110, 0.15, 'sine'), delay);
    });
  }, [playTone]);

  const playCastle = useCallback(() => {
    playTone(330, 0.08, 'sine');
    setTimeout(() => playTone(440, 0.08, 'sine'), 80);
  }, [playTone]);

  const playPromotion = useCallback(() => {
    [0, 80, 160, 240].forEach((delay, i) => {
      setTimeout(() => playTone(330 + i * 110, 0.12, 'sine'), delay);
    });
  }, [playTone]);

  const playGameStart = useCallback(() => {
    playTone(262, 0.15, 'sine');
    setTimeout(() => playTone(330, 0.15, 'sine'), 150);
    setTimeout(() => playTone(392, 0.2, 'sine'), 300);
  }, [playTone]);

  return {
    playMove,
    playCapture,
    playCheck,
    playCheckmate,
    playCastle,
    playPromotion,
    playGameStart,
  };
};
