"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { BeatType, NarrativeBeat } from "@/lib/beats/schema";
import { cn } from "@/lib/utils/cn";

const BEAT_TONE: Record<BeatType, string> = {
  opening: "bg-sky-600/90 text-white",
  rising: "bg-amber-600/90 text-white",
  midpoint: "bg-violet-600/90 text-white",
  setback: "bg-rose-600/90 text-white",
  climax: "bg-red-600/90 text-white",
  resolution: "bg-emerald-700/90 text-white",
  transition: "bg-slate-600/90 text-white",
};

export type BeatsMapChapter = {
  id: string;
  title: string;
  number: number;
  beats: NarrativeBeat[];
  totalParagraphs: number;
};

export type BeatsMapProps = {
  chapters: BeatsMapChapter[];
};

type LinePt = { pos: number; tension: number; summary: string; type: BeatType };

function buildTensionLine(chapter: BeatsMapChapter, totalP: number): LinePt[] {
  if (totalP < 1) return [];
  return chapter.beats
    .map((b) => {
      const mid = (b.start_paragraph + b.end_paragraph) / 2;
      const pos = (mid - 0.5) / totalP;
      return {
        pos: Math.min(1, Math.max(0, pos)),
        tension: b.tension,
        summary: b.summary,
        type: b.type,
      };
    })
    .sort((a, b) => a.pos - b.pos);
}

export function BeatsMap({ chapters }: BeatsMapProps) {
  return (
    <div className="space-y-8">
      {chapters.map((ch) => {
        const totalP = ch.totalParagraphs > 0 ? ch.totalParagraphs : 1;
        const lineData = buildTensionLine(ch, totalP);
        return (
          <div key={ch.id} className="min-w-0">
            <h3
              className="mb-2 text-sm font-semibold text-editorial-cream"
              title={ch.title}
            >{`Chapter ${ch.number}: ${ch.title}`}</h3>
            <div className="space-y-2">
              <div
                className="flex h-9 w-full overflow-hidden rounded-md border border-border/60 bg-card/30"
                role="img"
                aria-label={`Scene beats for chapter ${ch.number}`}
              >
                {ch.beats.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-xs text-editorial-muted">
                    No beat data
                  </div>
                ) : (
                  ch.beats.map((b) => {
                    const span = b.end_paragraph - b.start_paragraph + 1;
                    const w = (span / totalP) * 100;
                    return (
                      <div
                        key={`${b.start_paragraph}-${b.end_paragraph}-${b.type}`}
                        className={cn(
                          "flex min-w-0 items-center justify-center border-r border-black/20 px-0.5 text-center text-[10px] font-medium last:border-r-0",
                          BEAT_TONE[b.type],
                        )}
                        style={{ width: `${w}%` }}
                        title={b.summary}
                      >
                        <span className="line-clamp-2 w-full break-words">{b.type}</span>
                      </div>
                    );
                  })
                )}
              </div>
              {lineData.length > 0 ? (
                <div className="h-24 w-full min-w-0 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={lineData}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        dataKey="pos"
                        domain={[0, 1]}
                        tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
                        tick={{ fontSize: 10, fill: "var(--editorial-muted, #9ca3af)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        width={20}
                        tick={{ fontSize: 10, fill: "var(--editorial-muted, #9ca3af)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.[0]) return null;
                          const p = payload[0].payload as LinePt;
                          return (
                            <div className="max-w-xs rounded border border-border/80 bg-card px-2 py-1.5 text-xs shadow-md">
                              <p className="font-medium text-editorial-cream">Tension {p.tension}/10</p>
                              <p className="text-editorial-muted">{p.type}</p>
                              <p className="text-editorial-cream/90">{p.summary}</p>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tension"
                        stroke="hsl(43 50% 55%)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "hsl(43 50% 55%)" }}
                        activeDot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
