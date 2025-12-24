import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, Flag, RotateCcw, Loader2, Play, CheckCircle } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useChessSounds } from "@/hooks/useChessSounds";
import { PromotionDialog } from "@/components/PromotionDialog";

type PromotionPiece = 'q' | 'r' | 'b' | 'n';

interface PendingPromotion {
  from: Square;
  to: Square;
}

interface GameData {
  id: string;
  fen: string;
  pgn: string | null;
  result: string;
  white_player_id: string;
  black_player_id: string;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  tournament_id: string;
  round: number;
  white_ready: boolean;
  black_ready: boolean;
  started_at: string | null;
}

interface Player {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  avatar_initials: string | null;
}

const Game = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const sounds = useChessSounds();

  const [game, setGame] = useState<Chess>(new Chess());
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [whitePlayer, setWhitePlayer] = useState<Player | null>(null);
  const [blackPlayer, setBlackPlayer] = useState<Player | null>(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const isWhite = profile?.id === gameData?.white_player_id;
  const isBlack = profile?.id === gameData?.black_player_id;
  const isPlayer = isWhite || isBlack;
  const isMyTurn = (game.turn() === 'w' && isWhite) || (game.turn() === 'b' && isBlack);
  const myColor = isWhite ? 'white' : 'black';
  const gameStarted = gameData?.white_ready && gameData?.black_ready;
  const canPlay = gameStarted && gameData?.result === 'in_progress';

  useEffect(() => {
    if (gameId) {
      fetchGame();
      const unsubscribe = subscribeToGame();
      return unsubscribe;
    }
  }, [gameId]);

  useEffect(() => {
    // Only run timer if game has started and is in progress
    if (gameStarted && gameData?.result === 'in_progress') {
      const interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime(prev => Math.max(0, prev - 1));
        } else {
          setBlackTime(prev => Math.max(0, prev - 1));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameStarted, gameData?.result, game]);

  const fetchGame = async () => {
    if (!gameId) return;

    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (data) {
      setGameData(data as GameData);
      const newGame = new Chess();
      if (data.fen) {
        newGame.load(data.fen);
      }
      setGame(newGame);
      setWhiteTime(data.white_time_remaining || 600);
      setBlackTime(data.black_time_remaining || 600);

      const { data: white } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_initials')
        .eq('id', data.white_player_id)
        .single();
      
      const { data: black } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, avatar_initials')
        .eq('id', data.black_player_id)
        .single();

      if (white) setWhitePlayer(white);
      if (black) setBlackPlayer(black);
      
      sounds.playGameStart();
    }
    setIsLoading(false);
  };

  const subscribeToGame = () => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      }, (payload) => {
        const data = payload.new as GameData;
        setGameData(data);
        const newGame = new Chess();
        if (data.fen) {
          newGame.load(data.fen);
        }
        setGame(newGame);
        // Play sound for opponent's move
        if (data.pgn) {
          sounds.playMove();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

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

  const isPromotionMove = useCallback((from: Square, to: Square): boolean => {
    const piece = game.get(from);
    if (!piece || piece.type !== 'p') return false;
    const targetRank = to[1];
    return (piece.color === 'w' && targetRank === '8') || (piece.color === 'b' && targetRank === '1');
  }, [game]);

  const executeMove = useCallback((from: Square, to: Square, promotion: PromotionPiece = 'q') => {
    if (!gameData) return false;

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({ from, to, promotion });

      if (!move) return false;

      setGame(gameCopy);
      setSelectedSquare(null);
      setLegalMoves([]);
      playMoveSound(move);

      const newFen = gameCopy.fen();
      const newPgn = gameCopy.pgn();

      let result: string = 'in_progress';
      if (gameCopy.isCheckmate()) {
        result = gameCopy.turn() === 'w' ? 'black_wins' : 'white_wins';
      } else if (gameCopy.isDraw()) {
        result = 'draw';
      }

      supabase
        .from('games')
        .update({
          fen: newFen,
          pgn: newPgn,
          result: result as any,
          white_time_remaining: whiteTime,
          black_time_remaining: blackTime,
          ...(result !== 'in_progress' ? { ended_at: new Date().toISOString() } : {}),
        })
        .eq('id', gameId)
        .then(() => {
          if (result !== 'in_progress') {
            updatePlayerScores(result);
            toast({ title: "Game Over!", description: `Result: ${result.replace(/_/g, ' ')}` });
          }
        });

      return true;
    } catch {
      return false;
    }
  }, [game, gameData, gameId, whiteTime, blackTime, playMoveSound, toast]);

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
    if (!isMyTurn || !canPlay || pendingPromotion) return;

    if (selectedSquare && legalMoves.includes(square)) {
      if (isPromotionMove(selectedSquare, square)) {
        setPendingPromotion({ from: selectedSquare, to: square });
        return;
      }
      executeMove(selectedSquare, square);
      return;
    }

    const piece = game.get(square);
    const myColorChar = isWhite ? 'w' : 'b';
    if (piece && piece.color === myColorChar) {
      setSelectedSquare(square);
      setLegalMoves(getMoveOptions(square));
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [game, isMyTurn, canPlay, selectedSquare, legalMoves, isWhite, pendingPromotion, isPromotionMove, executeMove, getMoveOptions]);

  const onPieceDragBegin = useCallback((_piece: string, sourceSquare: Square) => {
    if (!isMyTurn || !canPlay || pendingPromotion) return false;
    
    setSelectedSquare(sourceSquare);
    setLegalMoves(getMoveOptions(sourceSquare));
    return true;
  }, [isMyTurn, canPlay, pendingPromotion, getMoveOptions]);

  const onPieceDragEnd = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const onDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    if (!isMyTurn || !canPlay || pendingPromotion) return false;

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
  }, [game, isMyTurn, canPlay, pendingPromotion, isPromotionMove, executeMove]);

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

  const updatePlayerScores = async (result: string) => {
    if (!gameData) return;

    let whiteScore = 0;
    let blackScore = 0;

    if (result === 'white_wins') {
      whiteScore = 1;
    } else if (result === 'black_wins') {
      blackScore = 1;
    } else if (result === 'draw') {
      whiteScore = 0.5;
      blackScore = 0.5;
    }

    const { data: whiteTp } = await supabase
      .from('tournament_players')
      .select('score')
      .eq('tournament_id', gameData.tournament_id)
      .eq('player_id', gameData.white_player_id)
      .single();

    const { data: blackTp } = await supabase
      .from('tournament_players')
      .select('score')
      .eq('tournament_id', gameData.tournament_id)
      .eq('player_id', gameData.black_player_id)
      .single();

    if (whiteTp) {
      await supabase
        .from('tournament_players')
        .update({ score: Number(whiteTp.score) + whiteScore })
        .eq('tournament_id', gameData.tournament_id)
        .eq('player_id', gameData.white_player_id);
    }

    if (blackTp) {
      await supabase
        .from('tournament_players')
        .update({ score: Number(blackTp.score) + blackScore })
        .eq('tournament_id', gameData.tournament_id)
        .eq('player_id', gameData.black_player_id);
    }
  };

  const setPlayerReady = async () => {
    if (!gameData || !isPlayer) return;

    const updateData = isWhite 
      ? { white_ready: true }
      : { black_ready: true };

    // Check if both will be ready after this update
    const bothReady = isWhite 
      ? (true && gameData.black_ready)
      : (gameData.white_ready && true);

    await supabase
      .from('games')
      .update({
        ...updateData,
        ...(bothReady ? { 
          result: 'in_progress' as any,
          started_at: new Date().toISOString()
        } : {})
      })
      .eq('id', gameId);

    if (bothReady) {
      sounds.playGameStart();
      toast({ title: "Game Started!", description: "White moves first. Good luck!" });
    } else {
      toast({ title: isWhite ? "Game Started!" : "Ready!", description: "Waiting for opponent..." });
    }
  };

  const resign = async () => {
    if (!gameData || !isPlayer || !gameStarted) return;
    
    const result = isWhite ? 'black_wins' : 'white_wins';
    
    await supabase
      .from('games')
      .update({
        result: result as any,
        ended_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    await updatePlayerScores(result);
    toast({ title: "You resigned", description: "Better luck next time!" });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Game not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <PromotionDialog
        isOpen={!!pendingPromotion}
        color={myColor}
        onSelect={handlePromotionSelect}
      />

      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    avatarUrl={blackPlayer?.avatar_url}
                    initials={blackPlayer?.avatar_initials}
                    name={blackPlayer?.full_name}
                    size="sm"
                  />
                  <div>
                    <p className="font-bold">{blackPlayer?.username || 'Black'}</p>
                    <p className="text-xs text-muted-foreground">Black</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${game.turn() === 'b' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold">{formatTime(blackTime)}</span>
                </div>
              </div>

              <div className="max-w-[min(100%,400px)] mx-auto">
                <Chessboard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  onSquareClick={onSquareClick}
                  onPieceDragBegin={onPieceDragBegin}
                  onPieceDragEnd={onPieceDragEnd}
                  boardOrientation={isBlack ? 'black' : 'white'}
                  arePiecesDraggable={isPlayer && isMyTurn && canPlay && !pendingPromotion}
                  customSquareStyles={customSquareStyles}
                />
              </div>

              <div className="flex items-center justify-between mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    avatarUrl={whitePlayer?.avatar_url}
                    initials={whitePlayer?.avatar_initials}
                    name={whitePlayer?.full_name}
                    size="sm"
                  />
                  <div>
                    <p className="font-bold">{whitePlayer?.username || 'White'}</p>
                    <p className="text-xs text-muted-foreground">White</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${game.turn() === 'w' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-bold">{formatTime(whiteTime)}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Game Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4 bg-muted rounded-lg">
                  {!gameStarted ? (
                    <>
                      <p className="font-bold text-lg">Waiting to Start</p>
                      <div className="mt-2 space-y-1">
                        <p className={`text-sm ${gameData.white_ready ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {gameData.white_ready ? '✓ White is ready' : '○ White not ready'}
                        </p>
                        <p className={`text-sm ${gameData.black_ready ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {gameData.black_ready ? '✓ Black is ready' : '○ Black not ready'}
                        </p>
                      </div>
                    </>
                  ) : gameData.result === 'in_progress' ? (
                    <>
                      <p className="font-bold text-lg">
                        {game.turn() === 'w' ? "White's Turn" : "Black's Turn"}
                      </p>
                      {isMyTurn && <p className="text-sm text-primary">Your move!</p>}
                    </>
                  ) : (
                    <p className="font-bold text-lg capitalize">
                      {gameData.result.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>

                {game.isCheck() && canPlay && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-center font-bold animate-pulse">
                    CHECK!
                  </div>
                )}

                {/* Start / Accept buttons */}
                {isPlayer && !gameStarted && gameData.result === 'pending' && (
                  <>
                    {isWhite && !gameData.white_ready && (
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={setPlayerReady}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Game
                      </Button>
                    )}
                    {isWhite && gameData.white_ready && !gameData.black_ready && (
                      <div className="p-3 bg-primary/10 rounded-lg text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Waiting for Black to accept...</p>
                      </div>
                    )}
                    {isBlack && !gameData.black_ready && gameData.white_ready && (
                      <Button className="w-full bg-green-600 hover:bg-green-700" onClick={setPlayerReady}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept & Start
                      </Button>
                    )}
                    {isBlack && !gameData.white_ready && (
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Waiting for White to start the game...</p>
                      </div>
                    )}
                  </>
                )}

                {isPlayer && canPlay && (
                  <Button variant="destructive" className="w-full" onClick={resign}>
                    <Flag className="h-4 w-4 mr-2" />
                    Resign
                  </Button>
                )}

                <Button variant="outline" className="w-full" onClick={() => navigate('/standings')}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Back to Standings
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Moves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono bg-muted p-3 rounded-lg max-h-48 overflow-y-auto">
                  {game.pgn() || 'No moves yet'}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;
