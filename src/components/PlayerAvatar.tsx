import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  initials?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
  xl: 'h-32 w-32 text-3xl',
};

export const PlayerAvatar = ({ 
  avatarUrl, 
  initials, 
  name,
  size = 'md',
  className 
}: PlayerAvatarProps) => {
  const displayInitials = initials || (name ? generateInitials(name) : '??');

  return (
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
  );
};

function generateInitials(fullName: string): string {
  const words = fullName.trim().split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return words[0]?.substring(0, 2).toUpperCase() || '??';
}
