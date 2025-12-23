import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type PieceType = 'q' | 'r' | 'b' | 'n';

interface PromotionDialogProps {
  isOpen: boolean;
  color: 'white' | 'black';
  onSelect: (piece: PieceType) => void;
}

const pieces: { type: PieceType; name: string; whiteSymbol: string; blackSymbol: string }[] = [
  { type: 'q', name: 'Queen', whiteSymbol: '♕', blackSymbol: '♛' },
  { type: 'r', name: 'Rook', whiteSymbol: '♖', blackSymbol: '♜' },
  { type: 'b', name: 'Bishop', whiteSymbol: '♗', blackSymbol: '♝' },
  { type: 'n', name: 'Knight', whiteSymbol: '♘', blackSymbol: '♞' },
];

export const PromotionDialog = ({ isOpen, color, onSelect }: PromotionDialogProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Choose Promotion</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 py-4">
          {pieces.map((piece) => (
            <Button
              key={piece.type}
              variant="outline"
              className="h-20 text-5xl hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={() => onSelect(piece.type)}
            >
              {color === 'white' ? piece.whiteSymbol : piece.blackSymbol}
            </Button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Select a piece to promote your pawn
        </p>
      </DialogContent>
    </Dialog>
  );
};
