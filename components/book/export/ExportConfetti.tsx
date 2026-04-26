export function ExportConfetti() {
  return (
    <div className="chapterai-confetti" aria-hidden>
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} className="chapterai-confetti-piece" />
      ))}
    </div>
  );
}
