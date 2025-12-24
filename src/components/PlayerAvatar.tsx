import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  initials?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isOnline?: boolean;
  showOnlineIndicator?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
  xl: 'h-32 w-32 text-3xl',
};

const indicatorSizes = {
  sm: 'h-2.5 w-2.5 right-0 bottom-0',
  md: 'h-3 w-3 right-0 bottom-0',
  lg: 'h-4 w-4 right-1 bottom-1',
  xl: 'h-5 w-5 right-2 bottom-2',
};

export const PlayerAvatar = ({ 
  avatarUrl, 
  initials, 
  name,
  size = 'md',
  className,
  isOnline,
  showOnlineIndicator = false,
}: PlayerAvatarProps) => {
  const displayInitials = initials || (name ? generateInitials(name) : '??');

  return (
    <div className="relative inline-block">
      <div 
        className={cn(
          "rounded-full flex items-center justify-center font-bold bg-primary text-primary-foreground overflow-hidden ring-2 ring-border",
          sizeClasses[size],
          className
        )}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={name || 'Player'} 
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{displayInitials}</span>
        )}
      </div>
      {showOnlineIndicator && (
        <span 
          className={cn(
            "absolute rounded-full border-2 border-background",
            indicatorSizes[size],
            isOnline ? "bg-green-500" : "bg-muted-foreground/50"
          )}
        />
      )}
    </div>
  );
};

function generateInitials(fullName: string): string {
  const words = fullName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return words[0]?.substring(0, 2).toUpperCase() || '??';
}
