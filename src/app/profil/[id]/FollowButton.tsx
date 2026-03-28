"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
    targetUserId,
    initialIsFollowing,
    followerCount
}: {
    targetUserId: string;
    initialIsFollowing: boolean;
    followerCount: number;
}) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const toggleFollow = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${targetUserId}/follow`, {
                method: isFollowing ? "DELETE" : "POST"
            });
            if (res.ok) {
                setIsFollowing(!isFollowing);
                router.refresh(); // Refresh to ensure server state updates count
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={toggleFollow}
            disabled={loading}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${isFollowing
                    ? "bg-black/10 dark:bg-white/10 text-white hover:bg-black/20 dark:bg-white/20 border border-black/10 dark:border-white/10"
                    : "bg-primary text-white hover:bg-primary-hover shadow-[0_0_20px_rgba(19,127,236,0.4)] hover:shadow-[0_0_30px_rgba(19,127,236,0.6)]"
                }`}
        >
            {loading ? (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            ) : isFollowing ? (
                <>
                    <span className="material-symbols-outlined text-xl">person_remove</span>
                    Unfollow
                </>
            ) : (
                <>
                    <span className="material-symbols-outlined text-xl">person_add</span>
                    Follow
                </>
            )}
        </button>
    );
}
