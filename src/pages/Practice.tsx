import { useState, useCallback, useEffect, useMemo } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bot, RotateCcw, Flag, Loader2, Sparkles } from "lucide-react";
import { useChessSounds } from "@/hooks/useChessSounds";
import { PromotionDialog } from "@/components/PromotionDialog";
import { AICommentary } from "@/components/AICommentary";

type Difficulty = "beginner" | "intermediate" | "advanced" | "master";
type PromotionPiece = 'q' | 'r' | 'b' | 'n';

interface PendingPromotion {
  from: Square;
  to: Square;
}

const Practice = () => {
  const { toast } = useToast();
  const sounds = useChessSounds();
  const [game, setGame] = useState<Chess>(new Chess());
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [isThinking, setIsThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost" | "draw">("playing");
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [lastMove, setLastMove] = useState<string | null>(null);

  const playMoveSound = useCallback((move: { captured?: string; san: string; flags: string }) => {
    if (move.san.includes('#')) {
      sounds.playCheckmate();
    } else if (move.san.includes('+')) {
      sounds.playCheck();
    } else if (move.captured) {
      sounds.playCapture();
    } else if (move.flags.includes('k') || move.flags.includes('q')) {
      sounds.playCastle();
    } else if (move.san.includes('=')) {
      sounds.playPromotion();
    } else {
      sounds.playMove();
    }
  }, [sounds]);

  const checkGameEnd = useCallback((currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'black' : 'white';
      if ((playerColor === 'white' && winner === 'white') || (playerColor === 'black' && winner === 'black')) {
        setGameStatus("won");
        toast({ title: "🎉 Congratulations!", description: "You won the game!" });
      } else {
        setGameStatus("lost");
        toast({ title: "Game Over", description: "The bot won this time. Try again!" });
      }
      return true;
    }
    if (currentGame.isDraw()) {
      setGameStatus("draw");
      toast({ title: "Draw!", description: "The game ended in a draw." });
      return true;
    }
    return false;
  }, [playerColor, toast]);

  const makeBotMove = useCallback(async (currentGame: Chess) => {
    if (checkGameEnd(currentGame)) return;
    
    const isPlayerTurn = (currentGame.turn() === 'w' && playerColor === 'white') || 
                         (currentGame.turn() === 'b' && playerColor === 'black');
    if (isPlayerTurn) return;

    setIsThinking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('chess-bot', {
        body: { fen: currentGame.fen(), difficulty }
      });

      if (error) {
        console.error("Bot error:", error);
        const moves = currentGame.moves({ verbose: true });
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          const newGame = new Chess(currentGame.fen());
          const move = newGame.move(randomMove);
          if (move) {
            setGame(newGame);
            setMoveHistory(prev => [...prev, move.san]);
            setLastMove(move.san);
            playMoveSound(move);
            checkGameEnd(newGame);
          }
        }
        setIsThinking(false);
        return;
      }

      const moveStr = data?.move;
      if (moveStr) {
        const newGame = new Chess(currentGame.fen());
        try {
          const move = newGame.move({
            from: moveStr.slice(0, 2),
            to: moveStr.slice(2, 4),
            promotion: moveStr[4] || 'q',
          });
          
          if (move) {
            setGame(newGame);
            setMoveHistory(prev => [...prev, move.san]);
            setLastMove(move.san);
            playMoveSound(move);
            checkGameEnd(newGame);
          } else {
            throw new Error("Invalid move");
          }
        } catch {
          const moves = currentGame.moves({ verbose: true });
          if (moves.length > 0) {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];
            newGame.load(currentGame.fen());
            const move = newGame.move(randomMove);
            if (move) {
              setGame(newGame);
              setMoveHistory(prev => [...prev, move.san]);
              setLastMove(move.san);
              playMoveSound(move);
              checkGameEnd(newGame);
            }
          }
        }
      }
    } catch (err) {
      console.error("Bot move error:", err);
    } finally {
      setIsThinking(false);
    }
  }, [difficulty, playerColor, checkGameEnd, playMoveSound]);

  useEffect(() => {
    if (playerColor === 'black' && game.history().length === 0 && gameStatus === 'playing') {
      sounds.playGameStart();
      makeBotMove(game);
    }
  }, [playerColor, game, gameStatus, makeBotMove, sounds]);

  const isPromotionMove = useCallback((from: Square, to: Square): boolean => {
    const piece = game.get(from);
    if (!piece || piece.type !== 'p') return false;
    const targetRank = to[1];
    return (piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1');
  }, [game]);

  const executeMove = useCallback((from: Square, to: Square, promotion: PromotionPiece = 'q') => {
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to, promotion });

      if (!move) return false;

      setGame(newGame);
      setMoveHistory(prev => [...prev, move.san]);
      setLastMove(move.san);
      setSelectedSquare(null);
      setLegalMoves([]);
      playMoveSound(move);
      
      if (!checkGameEnd(newGame)) {
        setTimeout(() => makeBotMove(newGame), 500);
      }

      return true;
    } catch {
      return false;
    }
  }, [game, checkGameEnd, makeBotMove, playMoveSound]);

  const handlePromotionSelect = useCallback((piece: PromotionPiece) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    }
  }, [pendingPromotion, executeMove]);

  const getMoveOptions = useCallback((square: Square) => {
    const moves = game.moves({ square, verbose: true });
    return moves.map(move => move.to as Square);
  }, [game]);

  const onSquareClick = useCallback((square: Square) => {
    if (gameStatus !== "playing" || isThinking || pendingPromotion) return;
    
    const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || 
                         (game.turn() === 'b' && playerColor === 'black');
    if (!isPlayerTurn) return;

    if (selectedSquare && legalMoves.includes(square)) {
      if (isPromotionMove(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executeMove(selectedSquare, square);
      return;
    }

    const piece = game.get(square);
    if (piece && ((piece.color === 'w' && playerColor === 'white') || (piece.color === 'b' && playerColor === 'black'))) {
      setSelectedSquare(square);
      setLegalMoves(getMoveOptions(square));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [game, playerColor, gameStatus, isThinking, selectedSquare, legalMoves, pendingPromotion, isPromotionMove, executeMove, getMoveOptions]);

  const onPieceDragBegin = useCallback((_piece: string, sourceSquare: Square) => {
    if (gameStatus !== "playing" || isThinking || pendingPromotion) return false;
    
    const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || 
                         (game.turn() === 'b' && playerColor === 'black');
    if (!isPlayerTurn) return false;

    setSelectedSquare(sourceSquare);
    setLegalMoves(getMoveOptions(sourceSquare));
    return true;
  }, [game, playerColor, gameStatus, isThinking, pendingPromotion, getMoveOptions]);

  const onPieceDragEnd = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    if (gameStatus !== "playing" || isThinking || pendingPromotion) return false;
    
    const isPlayerTurn = (game.turn() === 'w' && playerColor === 'white') || 
                         (game.turn() === 'b' && playerColor === 'black');
    if (!isPlayerTurn) return false;

    const from = sourceSquare as Square;
    const to = targetSquare as Square;

    // Check if this is a legal move
    const moves = game.moves({ square: from, verbose: true });
    const isLegal = moves.some(m => m.to === to);
    if (!isLegal) return false;

    if (isPromotionMove(from, to)) {
      setPendingPromotion({ from, to });
      return true;
    }

    return executeMove(from, to);
  }, [game, playerColor, gameStatus, isThinking, pendingPromotion, isPromotionMove, executeMove]);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      };
    }
    
    legalMoves.forEach(square => {
      const piece = game.get(square as Square);
      styles[square] = {
        background: piece 
          ? 'radial-gradient(circle, rgba(255, 0, 0, 0.4) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0, 128, 0, 0.4) 25%, transparent 25%)',
      };
    });
    
    return styles;
  }, [selectedSquare, legalMoves, game]);

  const resetGame = () => {
    setGame(new Chess());
    setGameStatus("playing");
    setMoveHistory([]);
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setPendingPromotion(null);
    sounds.playGameStart();
    if (playerColor === 'black') {
      setTimeout(() => {
        const newGame = new Chess();
        makeBotMove(newGame);
      }, 500);
    }
  };

  const resign = () => {
    setGameStatus("lost");
    toast({ title: "You resigned", description: "Better luck next time!" });
  };

  const switchColor = () => {
    const newColor = playerColor === 'white' ? 'black' : 'white';
    setPlayerColor(newColor);
    resetGame();
  };

  const difficultyColors: Record<Difficulty, string> = {
    beginner: "text-green-500",
    intermediate: "text-yellow-500",
    advanced: "text-orange-500",
    master: "text-red-500",
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PromotionDialog
        isOpen={!!pendingPromotion}
        color={playerColor}
        onSelect={handlePromotionSelect}
      />
      
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center justify-center gap-3">
            <Bot className="h-8 w-8 text-primary" />
            Practice vs AI Bot
            <Sparkles className="h-6 w-6 text-accent" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Sharpen your skills against our AI opponent
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold">AI Bot</p>
                    <p className={`text-xs capitalize ${difficultyColors[difficulty]}`}>
                      {difficulty}
                    </p>
                  </div>
                </div>
                {isThinking && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
              </div>

              <div className="relative max-w-[min(100%,400px)] mx-auto">
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  onPieceDragBegin={onPieceDragBegin}
                  onPieceDragEnd={onPieceDragEnd}
                  boardOrientation={playerColor}
                  arePiecesDraggable={gameStatus === "playing" && !isThinking && !pendingPromotion}
                  customSquareStyles={customSquareStyles}
                />
                {gameStatus !== "playing" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center p-6 bg-card rounded-xl border shadow-lg">
                      <p className="text-2xl font-bold mb-4">
                        {gameStatus === "won" && "🎉 Victory!"}
                        {gameStatus === "lost" && "😔 Defeat"}
                        {gameStatus === "draw" && "🤝 Draw"}
                      </p>
                      <Button onClick={resetGame} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Play Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="font-bold">You</p>
                    <p className="text-xs text-muted-foreground capitalize">{playerColor}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <AICommentary
              fen={game.fen()}
              lastMove={lastMove}
              isCheck={game.isCheck()}
              isCheckmate={game.isCheckmate()}
              isDraw={game.isDraw()}
              moveCount={moveHistory.length}
            />

            <Card>
              <CardHeader>
                <CardTitle>Game Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <Select 
                    value={difficulty} 
                    onValueChange={(val) => setDifficulty(val as Difficulty)}
                    disabled={gameStatus === "playing" && moveHistory.length > 0}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">🟢 Beginner</SelectItem>
                      <SelectItem value="intermediate">🟡 Intermediate</SelectItem>
                      <SelectItem value="advanced">🟠 Advanced</SelectItem>
                      <SelectItem value="master">🔴 Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Play as</label>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={switchColor}
                    disabled={gameStatus === "playing" && moveHistory.length > 0}
                  >
                    {playerColor === 'white' ? '⬜ White' : '⬛ Black'}
                  </Button>
                </div>

                <div className="pt-2 space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={resetGame}
                  >
                    <RotateCcw className="h-4 w-4" />
                    New Game
                  </Button>
                  
                  {gameStatus === "playing" && moveHistory.length > 0 && (
                    <Button 
                      variant="destructive" 
                      className="w-full gap-2" 
                      onClick={resign}
                    >
                      <Flag className="h-4 w-4" />
                      Resign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono bg-muted p-3 rounded-lg max-h-48 overflow-y-auto">
                  {moveHistory.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {moveHistory.map((move, i) => (
                        <span key={i} className={i % 2 === 0 ? 'text-foreground' : 'text-muted-foreground'}>
                          {i % 2 === 0 && <span className="text-xs text-muted-foreground mr-1">{Math.floor(i/2) + 1}.</span>}
                          {move}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No moves yet</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {game.isCheck() && gameStatus === "playing" && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-center font-bold animate-pulse">
                CHECK!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;
