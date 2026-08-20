// Reusable ad placement. Renders a labelled placeholder in dev; swap the
// inner block with Google AdSense or a direct <ins>/<iframe> tag when going live.
// Sizes match IAB slots. Every slot is a landmark so ad-blockers behave.

type AdSize =
  | "leaderboard"   // 728x90 / responsive
  | "billboard"     // 970x250
  | "rectangle"     // 300x250
  | "half-page"     // 300x600
  | "mobile-banner" // 320x50
  | "in-feed"       // fluid
  | "sticky-mobile";

const SIZE_CLASS: Record<AdSize, string> = {
  leaderboard: "min-h-[90px] md:min-h-[90px]",
  billboard: "min-h-[120px] md:min-h-[250px]",
  rectangle: "min-h-[250px]",
  "half-page": "min-h-[300px] md:min-h-[600px]",
  "mobile-banner": "min-h-[50px]",
  "in-feed": "min-h-[140px]",
  "sticky-mobile": "min-h-[50px]",
};

export function AdSlot({
  size,
  slotId,
  tone = "light",
  className = "",
  imageUrl,
  alt = "Advertisement",
}: {
  size: AdSize;
  slotId: string;
  tone?: "light" | "dark";
  className?: string;
  imageUrl?: string;
  alt?: string;
}) {
  const bg = tone === "dark" ? "bg-white/[0.03] border-white/10 text-white/40" : "bg-neutral-50 border-neutral-200 text-neutral-400";

  if (imageUrl) {
    return (
      <aside
        aria-label="Advertisement"
        data-ad-slot={slotId}
        className={`w-full overflow-hidden rounded-md border border-neutral-200 ${SIZE_CLASS[size]} ${className}`}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </aside>
    );
  }

  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={slotId}
      className={`w-full flex items-center justify-center rounded-md border border-dashed ${bg} ${SIZE_CLASS[size]} ${className}`}
    >
      <div className="text-center px-4 py-3">
        <div className="text-[10px] uppercase tracking-[0.2em]">Advertisement</div>
        <div className="text-[10px] mt-1 opacity-60">{slotId}</div>
      </div>
    </aside>
  );
}

export function StickyMobileAd({ slotId = "sticky-mobile-1" }: { slotId?: string }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-neutral-200 p-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <AdSlot size="sticky-mobile" slotId={slotId} />
    </div>
  );
}
