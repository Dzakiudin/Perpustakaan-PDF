"use client";

interface StarRatingProps {
    rating: number;
    maxStars?: number;
    size?: "sm" | "md" | "lg";
    interactive?: boolean;
    onChange?: (rating: number) => void;
}

export default function StarRating({ rating, maxStars = 5, size = "md", interactive = false, onChange }: StarRatingProps) {
    const sizeMap = { sm: "text-base", md: "text-xl", lg: "text-2xl" };
    const iconSize = sizeMap[size];

    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: maxStars }, (_, i) => {
                const starValue = i + 1;
                const isFull = starValue <= Math.floor(rating);
                const isHalf = !isFull && starValue <= rating + 0.5 && rating % 1 >= 0.3;

                return (
                    <button
                        key={i}
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && onChange?.(starValue)}
                        className={`${iconSize} transition-all duration-200 ${interactive
                            ? "cursor-pointer hover:scale-125 active:scale-90"
                            : "cursor-default"
                            } ${isFull || isHalf ? "text-amber-500" : "text-text-main/15"}`}
                    >
                        <span className={`material-symbols-outlined ${isFull ? "fill-icon" : ""}`}>
                            {isFull ? "star" : isHalf ? "star_half" : "star"}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
