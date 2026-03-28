"use client";

import { useState, useEffect, useMemo } from "react";

interface Props {
    userId: string;
    joinedYear: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ReadingHeatmap({ userId, joinedYear }: Props) {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({});
    const [totalSessions, setTotalSessions] = useState(0);
    const [loading, setLoading] = useState(true);

    // Available years from join year to current year
    const availableYears = useMemo(() => {
        const years: number[] = [];
        for (let y = currentYear; y >= joinedYear; y--) years.push(y);
        return years;
    }, [joinedYear, currentYear]);

    // Fetch activity data when year changes
    useEffect(() => {
        setLoading(true);
        fetch(`/api/users/${userId}/activity?year=${selectedYear}`)
            .then(r => r.json())
            .then(data => {
                setDailyCounts(data.dailyCounts || {});
                setTotalSessions(data.totalSessions || 0);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [userId, selectedYear]);

    // Generate full year grid: 53 weeks × 7 days
    const { weeks, monthPositions } = useMemo(() => {
        const jan1 = new Date(selectedYear, 0, 1);
        const dec31 = new Date(selectedYear, 11, 31);

        // Start from the Sunday of the week containing Jan 1
        const startDay = new Date(jan1);
        startDay.setDate(startDay.getDate() - startDay.getDay());

        // End at the Saturday of the week containing Dec 31
        const endDay = new Date(dec31);
        endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

        const weeks: { date: string; count: number; inYear: boolean }[][] = [];
        const monthPositions: { label: string; col: number }[] = [];
        let currentDate = new Date(startDay);
        let weekIdx = 0;
        let lastMonth = -1;

        while (currentDate <= endDay) {
            const week: { date: string; count: number; inYear: boolean }[] = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toISOString().split("T")[0];
                const inYear = currentDate.getFullYear() === selectedYear;
                week.push({
                    date: dateStr,
                    count: dailyCounts[dateStr] || 0,
                    inYear,
                });

                // Track month labels
                if (inYear && currentDate.getMonth() !== lastMonth && d === 0) {
                    monthPositions.push({ label: MONTH_LABELS[currentDate.getMonth()], col: weekIdx });
                    lastMonth = currentDate.getMonth();
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeks.push(week);
            weekIdx++;
        }

        return { weeks, monthPositions };
    }, [selectedYear, dailyCounts]);

    const getIntensity = (count: number, inYear: boolean) => {
        if (!inYear) return "bg-transparent";
        if (count === 0) return "bg-black/[0.06] dark:bg-white/[0.06]";
        if (count === 1) return "bg-emerald-500/30";
        if (count <= 3) return "bg-emerald-500/55";
        if (count <= 6) return "bg-emerald-500/80";
        return "bg-emerald-500";
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-up [animation-delay:300ms]">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-text-main uppercase tracking-tight flex items-center gap-3">
                    Reading <span className="text-emerald-400 italic">Activity</span>
                </h2>
                <span className="text-sm font-bold text-text-muted">
                    {loading ? "..." : <><span className="text-text-main font-black">{totalSessions}</span> reading sessions in {selectedYear}</>}
                </span>
            </div>

            <div className="flex gap-3">
                {/* Main heatmap card */}
                <div className="flex-1 bg-surface border border-black/5 dark:border-white/5 rounded-2xl px-4 py-3 overflow-x-auto">
                    {/* Month labels */}
                    <div className="flex mb-[2px]" style={{ paddingLeft: '28px' }}>
                        {monthPositions.map((m, i) => {
                            const nextCol = monthPositions[i + 1]?.col ?? weeks.length;
                            const span = nextCol - m.col;
                            return (
                                <div
                                    key={m.label + m.col}
                                    className="text-[10px] font-bold text-text-muted"
                                    style={{ width: `${span * 13}px`, minWidth: `${span * 13}px` }}
                                >
                                    {span >= 2 ? m.label : ""}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid */}
                    <div className="flex gap-[3px]">
                        {/* Day labels */}
                        <div className="flex flex-col gap-[3px] mr-[2px] shrink-0" style={{ width: '24px' }}>
                            {DAY_LABELS.map((label, i) => (
                                <div key={i} className="h-[10px] flex items-center">
                                    <span className="text-[9px] text-text-muted font-bold leading-none">
                                        {i % 2 === 1 ? label : ""}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Week columns */}
                        {loading ? (
                            <div className="flex gap-[3px] opacity-30">
                                {Array.from({ length: 53 }, (_, w) => (
                                    <div key={w} className="flex flex-col gap-[3px]">
                                        {Array.from({ length: 7 }, (_, d) => (
                                            <div key={d} className="size-[10px] rounded-[2px] bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            weeks.map((week, wIdx) => (
                                <div key={wIdx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dIdx) => (
                                        <div
                                            key={dIdx}
                                            title={day.inYear ? `${day.date}: ${day.count} sessions` : ""}
                                            className={`size-[10px] rounded-[2px] ${getIntensity(day.count, day.inYear)} hover:ring-1 hover:ring-primary/50 cursor-default transition-colors`}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                        <span className="text-[8px] font-bold text-text-muted">Less</span>
                        <div className="size-[10px] rounded-[2px] bg-black/[0.06] dark:bg-white/[0.06]" />
                        <div className="size-[10px] rounded-[2px] bg-emerald-500/30" />
                        <div className="size-[10px] rounded-[2px] bg-emerald-500/55" />
                        <div className="size-[10px] rounded-[2px] bg-emerald-500/80" />
                        <div className="size-[10px] rounded-[2px] bg-emerald-500" />
                        <span className="text-[8px] font-bold text-text-muted">More</span>
                    </div>
                </div>

                {/* Year filter sidebar */}
                <div className="flex flex-col gap-1 shrink-0">
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${selectedYear === year
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "text-text-muted hover:text-text-main hover:bg-black/5 dark:hover:bg-white/5"
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
