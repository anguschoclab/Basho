import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface BookmarkButtonProps {
  entityType: string;
  entityId: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline";
}

export function BookmarkButton({
  entityType,
  entityId,
  size = "sm",
  variant = "ghost",
}: BookmarkButtonProps) {
  const { isBookmarked, bookmarkEntity, unbookmarkEntity } = useGame();
  const bookmarked = isBookmarked(entityType, entityId);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={variant}
            className={`${size === "sm" ? "h-6 w-6" : "h-8 w-8"}`}
            onClick={(e) => {
              e.stopPropagation();
              if (bookmarked) {
                unbookmarkEntity(entityType, entityId);
              } else {
                bookmarkEntity(entityType, entityId);
              }
            }}
          >
            {bookmarked ? (
              <BookmarkCheck className={`${iconSize} text-primary`} />
            ) : (
              <Bookmark className={`${iconSize} text-muted-foreground`} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{bookmarked ? "Remove from bookmarks" : "Add to bookmarks"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
