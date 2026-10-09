"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="state" style={{ minHeight: "80vh", justifyContent: "center" }}>
      <div className="glyph">!</div>
      <h2>Something went wrong</h2>
      <p>The page failed to load. Check your connection and try again.</p>
      <button className="btn primary" onClick={reset}>Try again</button>
    </div>
  );
}
