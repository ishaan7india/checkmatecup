import { useState, useEffect } from 'react';
import { MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface AICommentaryProps {
  fen: string;
  lastMove: string | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  moveCount: number;
}

const funnyComments = [
  "Ooh, spicy move! 🌶️",
  "I've seen better... in my dreams!",
  "Bold strategy, Cotton!",
  "That piece had a family!",
  "Interesting... very interesting...",
  "My grandma plays faster than this!",
  "Chess isn't a game, it's a lifestyle! 😎",
  "Someone's been watching too much Queen's Gambit!",
  "The board is getting heated!",
  "Plot twist incoming!",
];

const checkComments = [
  "CHECK! Your king is sweating! 👑💦",
  "Knock knock! Who's there? CHECK!",
  "Your king just felt that one!",
  "Oof! That's gonna leave a mark!",
  "The king is in trouble! DRAMA!",
];

const captureComments = [
  "RIP to that piece! 🪦",
  "Yoink! Mine now!",
  "That piece just got yeeted!",
  "Nom nom nom! 🍽️",
  "And just like that... gone!",
  "Savage! No mercy!",
];

const checkmateComments = [
  "CHECKMATE! GG EZ! 🏆",
  "That's all she wrote, folks!",
  "FATALITY! 💀",
  "And the crowd goes WILD!",
  "Pack it up, we're done here!",
];

const drawComments = [
  "A draw? How... diplomatic! 🤝",
  "Nobody wins! Everyone gets a participation trophy!",
  "It's a tie! How anti-climactic!",
];

export const AICommentary = ({ lastMove, isCheck, isCheckmate, isDraw, moveCount }: AICommentaryProps) => {
  const [commentary, setCommentary] = useState<string>("Let the games begin! 🎮");
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (moveCount === 0) {
      setCommentary("Let the games begin! 🎮");
      return;
    }

    // Generate local commentary based on game state
    let newComment = "";
    
    if (isCheckmate) {
      newComment = checkmateComments[Math.floor(Math.random() * checkmateComments.length)];
    } else if (isDraw) {
      newComment = drawComments[Math.floor(Math.random() * drawComments.length)];
    } else if (isCheck) {
      newComment = checkComments[Math.floor(Math.random() * checkComments.length)];
    } else if (lastMove && lastMove.includes('x')) {
      newComment = captureComments[Math.floor(Math.random() * captureComments.length)];
    } else if (moveCount > 0) {
      newComment = funnyComments[Math.floor(Math.random() * funnyComments.length)];
    }

    if (newComment) {
      setCommentary(newComment);
    }
  }, [lastMove, isCheck, isCheckmate, isDraw, moveCount]);

  // Occasionally fetch AI commentary for variety
  useEffect(() => {
    if (moveCount > 0 && moveCount % 5 === 0 && !isCheckmate && !isDraw) {
      fetchAICommentary();
    }
  }, [moveCount]);

  const fetchAICommentary = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chess-commentary', {
        body: { moveCount, lastMove }
      });
      
      if (data?.commentary) {
        setCommentary(data.commentary);
      }
    } catch (err) {
      console.log('Commentary fetch failed, using local');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI Commentator</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
        {commentary}
      </p>
    </div>
  );
};
