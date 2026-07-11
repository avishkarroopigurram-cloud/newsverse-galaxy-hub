import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import logoAsset from "@/assets/newsverse-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=75`;

const ledgerData = [
  { label: "SENSEX", value: "81,204", chg: "+0.62%", up: true },
  { label: "NIFTY 50", value: "24,588", chg: "+0.54%", up: true },
  { label: "USD/INR", value: "84.91", chg: "-0.08%", up: false },
  { label: "BTC", value: "$71,240", chg: "+2.1%", up: true },
  { label: "ETH", value: "$3,812", chg: "+1.4%", up: true },
  { label: "BREAKING", value: "AI Governance Bill passed in Lok Sabha", chg: "", up: null as boolean | null },
  { label: "GOLD", value: "₹72,140/10g", chg: "+0.3%", up: true },
  { label: "CRUDE", value: "$83.2", chg: "-1.1%", up: false },
  { label: "WEATHER", value: "Delhi 34°C · Hazy", chg: "", up: null as boolean | null },
];

const breaking = [
  { cat: "World", title: "EU and India move closer to a landmark trade corridor agreement", img: img("photo-1521295121783-8a321d551ad2"), time: "14m ago", read: "4 min" },
  { cat: "Technology", title: "A Bengaluru startup's chip design just cut inference costs by 40%", img: img("photo-1518770660439-4636190af475"), time: "32m ago", read: "5 min" },
  { cat: "Sports", title: "SRH's top order finally clicks in a must-win chase", img: img("photo-1540747913346-19e32dc3e97e"), time: "48m ago", read: "3 min" },
  { cat: "Health", title: "New ICMR guidelines target rising antibiotic resistance in cities", img: img("photo-1584982751601-97dcc096659c"), time: "1h ago", read: "6 min" },
  { cat: "Business", title: "Rupee steadies after RBI's surprise liquidity move", img: img("photo-1611974789855-9c2a0a7236a3"), time: "1h ago", read: "4 min" },
];

const trending = [
  { cat: "Artificial Intelligence", title: "Inside India's first sovereign large language model project", dek: "A closer look at the public-private consortium racing to build a foundation model trained on Indian languages.", img: img("photo-1677442136019-21780ecad995"), read: "8 min", comments: 214 },
  { cat: "Politics", title: "The quiet coalition math behind the new education policy vote", dek: "How three regional parties found common ground on a bill that seemed dead on arrival two months ago.", img: img("photo-1529107386315-e1a2ed48a620"), read: "6 min", comments: 98 },
  { cat: "Science", title: "Scientists in Pune map a new fault line beneath the Deccan plateau", dek: "The discovery could reshape seismic risk assessments for millions living across three states.", img: img("photo-1451187580459-43490279c0fa"), read: "5 min", comments: 47 },
];

const latest = [
  { cat: "Startups", title: "A college dropout's logistics app just crossed 2 million riders", dek: "Bootstrapped for three years, the founder finally raised a Series A led by a Singapore fund.", img: img("photo-1556740738-b6a63e27c4df"), read: "4 min", comments: 31 },
  { cat: "Opinion", title: "Why India's AI policy should learn from its telecom playbook", dek: "A columnist argues the same regulatory patience that built Jio's scale could work for compute infrastructure.", img: img("photo-1451187580459-43490279c0fa"), read: "7 min", comments: 122 },
  { cat: "Entertainment", title: "The indie film that quietly outsold three studio releases", dek: "Made for under ₹2 crore, the psychological thriller is now eyeing an international festival run.", img: img("photo-1489599162946-4ebeba7f4dea"), read: "3 min", comments: 19 },
  { cat: "Space", title: "ISRO confirms date for next commercial satellite cluster launch", dek: "The mission will carry payloads for four countries, marking India's largest rideshare launch yet.", img: img("photo-1446776877081-d282a0f896e2"), read: "4 min", comments: 56 },
  { cat: "Education", title: "States pilot AI tutors in 4,000 government schools this term", dek: "Early results show gains in math scores, but teachers raise concerns about screen time.", img: img("photo-1503676260728-1c00da094a0b"), read: "6 min", comments: 88 },
  { cat: "World", title: "A quiet shift in Gulf oil diplomacy is reshaping shipping routes", dek: "Analysts say the change could benefit Indian ports positioned along the new corridor.", img: img("photo-1518770660439-4636190af475"), read: "5 min", comments: 24 },
];

const dash = [
  { label: "SENSEX", value: "81,204.32", chg: "+0.62% today", up: true },
  { label: "NIFTY 50", value: "24,588.10", chg: "+0.54% today", up: true },
  { label: "BITCOIN", value: "$71,240", chg: "+2.10% today", up: true },
  { label: "USD / INR", value: "₹84.91", chg: "-0.08% today", up: false },
];

const topics = ["Telangana","Hyderabad","India","World","Business","Technology","Artificial Intelligence","Markets","Politics","Sports","Entertainment","Health","Weather","Fact Check","Videos","Podcasts","Opinion","Startups","Science","Education"];
const missionTopics = ["Breaking News","Telangana","Hyderabad","Politics","Business","Technology","AI","Startups","Education","Health","Sports","Entertainment","Investigative Journalism","Fact Checking","Opinion & Analysis"];

const telanganaLead = {
  cat: "Telangana · Flagship",
  title: "Hyderabad's ORR to Regional Ring Road: inside Telangana's ₹36,000 crore mobility blueprint",
  dek: "An exclusive NewsVerse investigation on how the state's new mobility corridor could reshape land economics from Sangareddy to Yadadri — and who stands to gain first.",
  img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1400&q=80",
  read: "9 min",
  byline: "By NewsVerse Telangana Bureau",
};

const telanganaStories = [
  { cat: "Telangana", title: "Kaleshwaram audit report: what the CAG actually flagged, line by line", img: img("photo-1509316975850-ff9c5deb0cd9"), read: "7 min" },
  { cat: "Telangana", title: "Warangal's textile cluster is quietly becoming India's next apparel export hub", img: img("photo-1441986300917-64674bd600d8"), read: "5 min" },
  { cat: "Telangana", title: "Inside the KTR–Revanth political recalibration ahead of the 2028 cycle", img: img("photo-1529107386315-e1a2ed48a620"), read: "6 min" },
];

const hyderabad = [
  { cat: "Hyderabad", title: "Metro Phase-2 alignment finalized: 5 corridors, 76 new stations", dek: "HMRL will move to tendering by Q2, with early works planned along the Old City corridor.", img: img("photo-1587474260584-136574528ed5"), read: "5 min", comments: 64 },
  { cat: "Hyderabad", title: "Genome Valley's next act: cell therapy manufacturing at commercial scale", dek: "Three biotech majors have signed 15-year leases as Telangana's life-sciences bet matures.", img: img("photo-1581091226825-a6a2a5aee158"), read: "6 min", comments: 41 },
  { cat: "Hyderabad", title: "Charminar restoration enters final phase after 3-year conservation study", dek: "ASI confirms structural interventions will preserve the 1591 monument for another century.", img: img("photo-1524492412937-b28074a5d7da"), read: "4 min", comments: 28 },
];

function Icon({ d, extra }: { d: string; extra?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={extra ? 1.5 : 2}>
      <path d={d} />
    </svg>
  );
}

function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".reveal");
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const [subscribed, setSubscribed] = useState(false);

  return (
    <div ref={rootRef} className="nv-root">
      <style>{css}</style>

      <header>
        <div className="wrap navbar">
          <a href="#" className="logo" aria-label="NewsVerse home">
            <span className="logo-badge">
              <img src={logoAsset.url} alt="NewsVerse logo" className="logo-img" />
            </span>
            <span className="logo-text">news<span className="dot">•</span>verse</span>
          </a>
          <nav className="navlinks">
            <a href="#">India</a><a href="#">World</a><a href="#">Business</a>
            <a href="#">Technology</a><a href="#">AI</a><a href="#">Sports</a>
            <a href="#">Opinion</a><a href="#">Markets</a>
          </nav>
          <div className="navactions">
            <button className="navicon" aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button className="navicon" aria-label="AI Search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
            </button>
            <button className="navicon" aria-label="Toggle dark mode" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>
            </button>
            <a href="#" className="btn btn-ghost">Log in</a>
            <a href="#" className="btn btn-gold">Subscribe</a>
          </div>
        </div>
      </header>

      <div className="ledger" aria-label="Live market and news ticker">
        <div className="ledger-track">
          {[...ledgerData, ...ledgerData].map((d, i) => (
            <span className="ledger-item" key={i}>
              <span>{d.label}</span>
              <b>{d.value}</b>
              {d.chg && <span className={d.up ? "up" : "down"}>{d.chg}</span>}
            </span>
          ))}
        </div>
      </div>

      <main>
        <section className="hero" style={{ borderTop: "none", paddingTop: 48 }}>
          <div className="wrap hero-grid">
            <div className="hero-main reveal">
              <div className="hero-media">
                <img src="https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&q=80" alt="Parliament session" />
                <div className="hero-caption">
                  <span className="hero-tag">● Breaking — Politics</span>
                  <h1 className="hero-headline">Parliament clears landmark AI Governance Bill after 14-hour debate</h1>
                  <p className="hero-dek">The bill establishes India's first statutory framework for algorithmic accountability, with compliance deadlines beginning Q1 2027.</p>
                  <div className="hero-meta">
                    <span className="mono">6 min read</span><span>·</span>
                    <span className="mono">Updated 12 min ago</span><span>·</span>
                    <span>By Ananya Kulkarni</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="side-col reveal">
              <div className="side-head"><span className="eyebrow">Editor's Pick</span></div>
              <div className="editor-pick">
                {[
                  { n: "01", cat: "Technology", t: "Inside the quiet AI arms race between India's three biggest telecom networks" },
                  { n: "02", cat: "World", t: "Why European central banks are watching the rupee's rise this quarter" },
                  { n: "03", cat: "Science", t: "ISRO's next lunar payload will test water-extraction tech at the south pole" },
                  { n: "04", cat: "Business", t: "The startup founders quietly building India's answer to enterprise AI" },
                ].map((p) => (
                  <div className="pick-item" key={p.n}>
                    <span className="pick-num">{p.n}</span>
                    <div>
                      <span className="pick-cat">{p.cat}</span>
                      <div className="pick-title">{p.t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Right Now</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Breaking News</h2>
              </div>
              <a className="view-all" href="#">View all →</a>
            </div>
            <div className="carousel reveal">
              {breaking.map((b, i) => (
                <article className="carousel-card" key={i}>
                  <div className="carousel-media">
                    <img src={b.img} alt={b.title} loading="lazy" />
                    <span className="ai-pill">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
                      AI Summary
                    </span>
                  </div>
                  <div className="carousel-body">
                    <span className="story-cat">{b.cat}</span>
                    <div className="carousel-title">{b.title}</div>
                    <div className="carousel-foot"><span>{b.time}</span><span>{b.read} read</span></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="tg-section">
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Flagship · Telangana</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Telangana Today</h2>
                <p className="section-sub">India's most trusted newsroom on Telangana — reported from the ground, verified before it moves.</p>
              </div>
              <a className="view-all" href="#">All Telangana coverage →</a>
            </div>

            <div className="tg-grid reveal">
              <article className="tg-lead">
                <div className="tg-lead-media">
                  <img src={telanganaLead.img} alt={telanganaLead.title} />
                  <span className="hero-tag">● {telanganaLead.cat}</span>
                </div>
                <div className="tg-lead-body">
                  <h3 className="tg-lead-title">{telanganaLead.title}</h3>
                  <p className="tg-lead-dek">{telanganaLead.dek}</p>
                  <div className="hero-meta">
                    <span className="mono">{telanganaLead.read} read</span><span>·</span>
                    <span>{telanganaLead.byline}</span>
                  </div>
                </div>
              </article>

              <div className="tg-rail">
                {telanganaStories.map((s, i) => (
                  <article className="tg-rail-item" key={i}>
                    <div className="tg-rail-media"><img src={s.img} alt={s.title} loading="lazy" /></div>
                    <div>
                      <span className="story-cat">{s.cat}</span>
                      <div className="tg-rail-title">{s.title}</div>
                      <div className="story-foot"><span>{s.read} read</span></div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Capital Desk</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Hyderabad</h2>
              </div>
              <a className="view-all" href="#">More from Hyderabad →</a>
            </div>
            <div className="grid-3 reveal">
              {hyderabad.map((t, i) => <StoryCard key={i} {...t} />)}
            </div>
          </div>
        </section>



        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Most Read</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Trending Today</h2>
              </div>
              <a className="view-all" href="#">View all →</a>
            </div>
            <div className="grid-3 reveal">
              {trending.map((t, i) => <StoryCard key={i} {...t} />)}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Explore</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Browse by Topic</h2>
              </div>
            </div>
            <div className="topic-rail reveal">
              {topics.map((t) => <a key={t} className="topic-chip" href="#">{t}</a>)}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Live Data</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Markets &amp; Crypto</h2>
              </div>
              <a className="view-all" href="#">Full dashboard →</a>
            </div>
            <div className="dash-grid reveal">
              {dash.map((d) => (
                <div className="dash-card" key={d.label}>
                  <div className="dash-label">{d.label}</div>
                  <div className="dash-value">{d.value}</div>
                  <div className={`dash-change ${d.up ? "up" : "down"}`}>{d.chg}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ai-section">
          <div className="wrap">
            <div className="reveal">
              <span className="eyebrow">Powered by NewsVerse Intelligence</span>
              <h2 className="section-title" style={{ marginTop: 8, maxWidth: 560 }}>Journalism, augmented — never automated away</h2>
              <p style={{ color: "var(--gray)", maxWidth: 520, marginTop: 14, fontSize: 14.5, lineHeight: 1.6 }}>
                Every story is reported and verified by a human journalist. AI handles the rest — summarizing, reading aloud, translating, and surfacing what matters to you.
              </p>
            </div>
            <div className="ai-grid reveal">
              {[
                { t: "AI Summary", p: "Every article distilled into a 30-second brief, generated fresh with each update.", d: "M4 6h16M4 12h10M4 18h16" },
                { t: "AI Fact Checker", p: "Claims cross-referenced in real time against verified primary sources.", d: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
                { t: "Voice Reader", p: "Natural narration in 12 Indian languages, playable from any article.", d: "M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4" },
                { t: "AI Search", p: "Ask a question in plain language, get a sourced answer with citations.", d: "M21 21l-4.35-4.35" },
                { t: "Personalized Feed", p: "A homepage that learns your beats without ever showing you a filter bubble.", d: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
                { t: "Related Stories", p: "Context threaded automatically from years of NewsVerse archives.", d: "M4 4h7l2 3h7v11a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" },
                { t: "Live Translation", p: "Read any story in 22 scheduled languages, updated as the report updates.", d: "M5 8l6 6M4 14l6-6 2-3M2 5h12M11 2l1 3M22 22l-5-10-5 10M14 18h6" },
                { t: "Instant Timeline", p: "Fast-moving stories automatically organized into a chronological trail.", d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
              ].map((c) => (
                <div className="ai-card" key={c.t}>
                  <Icon d={c.d} extra="thin" />
                  <h4>{c.t}</h4>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head reveal">
              <div>
                <span className="eyebrow">Just In</span>
                <h2 className="section-title" style={{ marginTop: 8 }}>Latest News</h2>
              </div>
              <a className="view-all" href="#">View all →</a>
            </div>
            <div className="grid-3 reveal">
              {latest.map((t, i) => <StoryCard key={i} {...t} />)}
            </div>
          </div>
        </section>

        <section className="founder-section">
          <div className="wrap">
            <div className="reveal">
              <span className="eyebrow">Leadership</span>
              <h2 className="section-title" style={{ marginTop: 8 }}>The Founder</h2>
            </div>

            <div className="founder-grid reveal" style={{ marginTop: 36 }}>
              <div className="avatar-plaque">
                <div className="avatar-mono">MR</div>
                <div className="avatar-name">Dr. Mattepally Rajanikanth</div>
                <div className="avatar-role">Founder &amp; Editor-in-Chief, NewsVerse</div>
                
                <div className="avatar-divider" />
                <div className="avatar-award">
                  <b>Bharatiya Padma Bhushan Samman 2026–27</b><br />
                  in Journalism, conferred by the World Culture and Environment Protection Commission (WCEPC)
                </div>
              </div>

              <div className="founder-bio">
                <p>Dr. Mattepally Rajanikanth is a senior journalist, media strategist, and advertising expert with <b>25+ years of experience</b> in journalism, media management, and business development.</p>
                <p>Throughout his career, he has built a reputation for combining editorial excellence with strong expertise in media advertising — helping publications grow through strategic partnerships and revenue generation.</p>
                <p>He has been recognized at various national platforms for his contributions to journalism, including being conferred the <b>Bharatiya Padma Bhushan Samman 2026–27</b> in the field of Journalism by the WCEPC.</p>

                <div className="founder-cols">
                  <div>
                    <h5>Professional Highlights</h5>
                    <ul>
                      <li>25+ years of journalism experience</li>
                      <li>Founder &amp; Editor-in-Chief of NewsVerse</li>
                      <li>Expert in editorial leadership</li>
                      <li>Specialist in newspaper &amp; digital media growth</li>
                      <li>Advertising &amp; revenue growth strategist</li>
                      <li>Brand development expert</li>
                      <li>Public relations &amp; media partnerships</li>
                      <li>Mentor to young journalists</li>
                    </ul>
                  </div>
                  <div>
                    <h5>Core Expertise</h5>
                    <ul>
                      <li>Journalism</li>
                      <li>Editorial management</li>
                      <li>Media planning</li>
                      <li>Advertisement strategy</li>
                      <li>Digital news publishing</li>
                      <li>Political &amp; public affairs reporting</li>
                      <li>Brand partnerships</li>
                      <li>Marketing &amp; revenue generation</li>
                    </ul>
                  </div>
                </div>

                <div className="vision-block">
                  <span className="eyebrow">Vision</span>
                  <p className="vision-quote">"To build India's most trusted and technology-driven digital newsroom where truth, credibility, and responsible journalism come before everything else."</p>
                </div>

                <span className="eyebrow" style={{ marginTop: 8, display: "inline-flex" }}>Leadership Philosophy</span>
                <div className="philosophy-list">
                  {["Truth before speed","Credibility before clicks","People before algorithms","Journalism with integrity","Innovation with responsibility"].map((p, i) => (
                    <div className="philosophy-row" key={p}>
                      <span className="philosophy-num">{String(i + 1).padStart(2, "0")}</span>
                      <span className="philosophy-text">{p}</span>
                    </div>
                  ))}
                </div>

                <div className="mission-block">
                  <span className="eyebrow">NewsVerse Mission</span>
                  <p style={{ marginTop: 14 }}>
                    To create a world-class digital media platform that delivers breaking news, politics, business, technology, AI, startups, education, health, sports, entertainment, investigative journalism, fact-checking, and opinion &amp; analysis — with speed, transparency, and accuracy.
                  </p>
                  <div className="topic-rail">
                    {missionTopics.map((t) => <span className="topic-chip" key={t}>{t}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="newsletter">
          <div className="wrap">
            <div className="reveal">
              <span className="eyebrow" style={{ justifyContent: "center" }}>The Morning Brief</span>
              <h3 style={{ marginTop: 16 }}>One email. Everything that matters. Every morning at 6 AM.</h3>
              <p>Join 480,000+ readers who start their day with NewsVerse — no noise, no spin.</p>
              <form className="news-form" onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}>
                <input type="email" placeholder="you@email.com" required aria-label="Email address" />
                <button type="submit" className="btn btn-gold">{subscribed ? "Subscribed ✓" : "Subscribe"}</button>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-col">
              <div className="logo" style={{ marginBottom: 16 }}>
                <img src={logoAsset.url} alt="NewsVerse" className="logo-img" />
                <span className="logo-text">news<span className="dot">•</span>verse</span>
              </div>
              <p style={{ color: "var(--gray)", fontSize: 13, lineHeight: 1.6, maxWidth: 220 }}>
                Truth beyond headlines. Independent, AI-augmented journalism from India, for the world.
              </p>
            </div>
            <div className="foot-col">
              <h5>Sections</h5>
              <a href="#">India</a><a href="#">World</a><a href="#">Business</a><a href="#">Technology</a><a href="#">Sports</a>
            </div>
            <div className="foot-col">
              <h5>Formats</h5>
              <a href="#">Podcasts</a><a href="#">Videos</a><a href="#">Photo Stories</a><a href="#">Live Blogs</a><a href="#">Newsletters</a>
            </div>
            <div className="foot-col">
              <h5>Company</h5>
              <a href="#">About</a><a href="#">Newsroom Ethics</a><a href="#">Careers</a><a href="#">Contact</a>
            </div>
            <div className="foot-col">
              <h5>Legal</h5>
              <a href="#">Privacy Policy</a><a href="#">Terms of Use</a><a href="#">Corrections</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 NewsVerse Media Pvt. Ltd. All rights reserved.</span>
            <span className="mono">Built for truth. Verified by humans.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StoryCard({ img: image, cat, title, dek, read, comments }: { img: string; cat: string; title: string; dek: string; read: string; comments: number }) {
  return (
    <article className="story-card">
      <div className="story-media"><img src={image} alt={title} loading="lazy" /></div>
      <span className="story-cat">{cat}</span>
      <div className="story-title">{title}</div>
      <div className="story-dek">{dek}</div>
      <div className="story-foot"><span>{read} read</span><span>·</span><span>{comments} comments</span></div>
    </article>
  );
}

const css = `
.nv-root{
  --ink:#0B0D12; --ink-2:#12151C; --paper:#F5F3EE; --paper-dim:#EAE7DF;
  --blue:#3352FF; --blue-deep:#1E3FD9; --gold:#C9A227; --gray:#9DA3AE;
  --line: rgba(245,243,238,0.10); --line-strong: rgba(245,243,238,0.18);
  --glass: rgba(255,255,255,0.045); --radius: 2px;
  background: var(--ink); color: var(--paper);
  font-family:'Inter', sans-serif; -webkit-font-smoothing:antialiased;
  min-height:100vh;
}
[data-theme="light"] .nv-root{
  --ink:#F5F3EE; --ink-2:#EDEAE1; --paper:#0B0D12; --paper-dim:#1A1D24;
  --line: rgba(11,13,18,0.10); --line-strong: rgba(11,13,18,0.18);
  --glass: rgba(11,13,18,0.04); --gray:#5C6270;
}
.nv-root *, .nv-root *::before, .nv-root *::after { box-sizing:border-box; }
.nv-root a{ color:inherit; text-decoration:none; }
.nv-root button{ font-family:inherit; cursor:pointer; }
.nv-root ::selection{ background: var(--gold); color:#0B0D12; }
.nv-root .mono{ font-family:'JetBrains Mono', monospace; }
.nv-root img{ display:block; max-width:100%; }
.nv-root .wrap{ max-width:1360px; margin:0 auto; padding:0 40px; }
.nv-root .eyebrow{
  font-family:'JetBrains Mono', monospace; font-size:11px; letter-spacing:.14em;
  text-transform:uppercase; color: var(--gold);
  display:inline-flex; align-items:center; gap:8px;
}
.nv-root .eyebrow::before{ content:""; width:14px; height:1px; background: var(--gold); display:inline-block; }

.nv-root header{
  position:sticky; top:0; z-index:100;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  background: color-mix(in srgb, var(--ink) 78%, transparent);
  border-bottom:1px solid var(--line);
}
.nv-root .navbar{ display:flex; align-items:center; justify-content:space-between; height:72px; gap:24px; }
.nv-root .logo{
  font-family:'Fraunces', serif; font-weight:600; font-size:23px; letter-spacing:-.01em;
  display:flex; align-items:center; gap:10px;
}
.nv-root .logo-img{ height:36px; width:auto; object-fit:contain; }
.nv-root .logo-text{ display:inline-flex; align-items:center; }
.nv-root .logo .dot{ color:var(--blue); margin:0 1px; }
.nv-root .navlinks{ display:flex; align-items:center; gap:26px; font-size:13.5px; font-weight:500; }
.nv-root .navlinks a{ opacity:.78; transition:opacity .2s ease, color .2s ease; }
.nv-root .navlinks a:hover{ opacity:1; color:var(--gold); }
.nv-root .navactions{ display:flex; align-items:center; gap:12px; }
.nv-root .navicon{
  width:36px; height:36px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  border:1px solid var(--line-strong); background:var(--glass); color:var(--paper);
  transition: border-color .2s ease, transform .2s ease;
}
.nv-root .navicon:hover{ border-color: var(--gold); transform: translateY(-1px); }
.nv-root .navicon svg{ width:16px; height:16px; }
.nv-root .btn{
  padding:9px 20px; font-size:13px; font-weight:600; border-radius:999px;
  border:1px solid var(--line-strong); background:transparent; color:var(--paper);
  transition: all .25s ease; display:inline-flex; align-items:center;
}
.nv-root .btn-gold{ background: var(--gold); color:#0B0D12; border-color:var(--gold); }
.nv-root .btn-gold:hover{ filter:brightness(1.1); transform: translateY(-1px); }
.nv-root .btn-ghost:hover{ border-color: var(--gold); color:var(--gold); }

.nv-root .ledger{
  border-bottom:1px solid var(--line);
  background: var(--ink-2);
  overflow:hidden; white-space:nowrap; position:relative;
  height:38px; display:flex; align-items:center;
}
.nv-root .ledger::before{
  content:"LIVE"; font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.12em;
  background: var(--blue-deep); color:#fff; padding:4px 10px; margin-right:16px; flex-shrink:0;
  display:flex; align-items:center; gap:6px; height:100%;
}
.nv-root .ledger-track{ display:flex; gap:48px; animation: nv-scroll 38s linear infinite; }
.nv-root .ledger:hover .ledger-track{ animation-play-state: paused; }
@keyframes nv-scroll{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
.nv-root .ledger-item{ font-family:'JetBrains Mono',monospace; font-size:12.5px; color:var(--gray); display:flex; gap:10px; align-items:center; }
.nv-root .ledger-item b{ color:var(--paper); font-weight:500; }
.nv-root .up{ color:#3FCF7A; } .nv-root .down{ color:#FF5C5C; }

.nv-root .hero{ padding:64px 0 40px; }
.nv-root .hero-grid{ display:grid; grid-template-columns: 1.15fr .85fr; gap:36px; }
.nv-root .hero-main{ position:relative; border:1px solid var(--line); }
.nv-root .hero-media{ position:relative; height:560px; overflow:hidden; }
.nv-root .hero-media img{ width:100%; height:100%; object-fit:cover; transition: transform 1.2s cubic-bezier(.16,1,.3,1); }
.nv-root .hero-main:hover .hero-media img{ transform: scale(1.045); }
.nv-root .hero-media::after{
  content:""; position:absolute; inset:0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.85) 100%);
}
.nv-root .hero-caption{ position:absolute; left:0; right:0; bottom:0; padding:34px; z-index:2; }
.nv-root .hero-tag{
  display:inline-flex; align-items:center; gap:8px; background: var(--blue-deep); color:#fff;
  font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase;
  padding:5px 11px; margin-bottom:16px;
}
.nv-root .hero-headline{
  font-family:'Fraunces', serif; font-weight:600; font-size:44px; line-height:1.06; letter-spacing:-.015em;
  color:#fff; max-width:640px;
}
.nv-root .hero-dek{ color:#D9D9D9; font-size:15px; margin-top:14px; max-width:520px; line-height:1.55; }
.nv-root .hero-meta{ display:flex; flex-wrap:wrap; align-items:center; gap:14px; margin-top:20px; color:#B8B8B8; font-size:12.5px; }

.nv-root .side-col{ display:flex; flex-direction:column; gap:22px; }
.nv-root .side-head{ display:flex; align-items:center; justify-content:space-between; }
.nv-root .editor-pick{ display:flex; flex-direction:column; gap:18px; }
.nv-root .pick-item{ display:flex; gap:14px; padding-bottom:18px; border-bottom:1px solid var(--line); }
.nv-root .pick-item:last-child{ border-bottom:none; padding-bottom:0; }
.nv-root .pick-num{ font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--gold); padding-top:2px; }
.nv-root .pick-title{ font-family:'Fraunces', serif; font-weight:500; font-size:16.5px; line-height:1.32; letter-spacing:-.005em; cursor:pointer; }
.nv-root .pick-title:hover{ color:var(--gold); }
.nv-root .pick-cat{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--blue); text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; display:block; }

.nv-root section{ padding: 58px 0; border-top:1px solid var(--line); }
.nv-root .section-head{ display:flex; align-items:baseline; justify-content:space-between; margin-bottom:32px; gap:16px; flex-wrap:wrap; }
.nv-root .section-title{ font-family:'Fraunces', serif; font-size:28px; font-weight:600; letter-spacing:-.01em; }
.nv-root .view-all{ font-size:12.5px; font-weight:600; color:var(--gray); display:flex; align-items:center; gap:6px; }
.nv-root .view-all:hover{ color: var(--gold); }

.nv-root .carousel{ display:flex; gap:20px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:6px; scrollbar-width:none; }
.nv-root .carousel::-webkit-scrollbar{ display:none; }
.nv-root .carousel-card{
  scroll-snap-align:start; flex:0 0 320px; border:1px solid var(--line); background:var(--glass);
  transition: transform .3s ease, border-color .3s ease; position:relative;
}
.nv-root .carousel-card:hover{ transform: translateY(-4px); border-color: var(--line-strong); }
.nv-root .carousel-media{ height:190px; overflow:hidden; position:relative; }
.nv-root .carousel-media img{ width:100%; height:100%; object-fit:cover; }
.nv-root .ai-pill{
  position:absolute; top:12px; right:12px; z-index:2;
  background: color-mix(in srgb, var(--ink) 55%, transparent);
  backdrop-filter: blur(8px);
  border:1px solid rgba(255,255,255,.25);
  color:#fff; font-family:'JetBrains Mono',monospace; font-size:9.5px; letter-spacing:.06em;
  padding:5px 9px; border-radius:999px; display:flex; align-items:center; gap:5px;
}
.nv-root .ai-pill svg{ width:10px; height:10px; }
.nv-root .carousel-body{ padding:18px; }
.nv-root .carousel-title{ font-family:'Fraunces', serif; font-size:17px; font-weight:500; line-height:1.3; }
.nv-root .carousel-foot{ display:flex; justify-content:space-between; margin-top:14px; font-size:11.5px; color:var(--gray); font-family:'JetBrains Mono',monospace; }

.nv-root .grid-3{ display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
.nv-root .story-card{ cursor:pointer; }
.nv-root .story-media{ height:210px; overflow:hidden; margin-bottom:16px; position:relative; }
.nv-root .story-media img{ width:100%; height:100%; object-fit:cover; transition: transform .5s ease; }
.nv-root .story-card:hover .story-media img{ transform: scale(1.06); }
.nv-root .story-cat{ font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--blue); text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; display:block; }
.nv-root .story-title{ font-family:'Fraunces', serif; font-size:19px; font-weight:500; line-height:1.32; margin-bottom:8px; }
.nv-root .story-dek{ font-size:13.5px; color:var(--gray); line-height:1.5; }
.nv-root .story-foot{ display:flex; gap:12px; margin-top:12px; font-size:11.5px; color:var(--gray); font-family:'JetBrains Mono',monospace; }

.nv-root .topic-rail{ display:flex; flex-wrap:wrap; gap:10px; }
.nv-root .topic-chip{
  padding:9px 18px; border:1px solid var(--line-strong); font-size:12.5px; font-weight:500;
  transition: all .2s ease; border-radius:999px;
}
.nv-root .topic-chip:hover{ background: var(--gold); color:#0B0D12; border-color:var(--gold); cursor:pointer; }

.nv-root .ai-section{ background: var(--ink-2); }
.nv-root .ai-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background: var(--line); border:1px solid var(--line); margin-top:32px; }
.nv-root .ai-card{ background: var(--ink-2); padding:30px 26px; transition: background .3s ease; }
.nv-root .ai-card:hover{ background: var(--ink); }
.nv-root .ai-card svg{ width:34px; height:34px; margin-bottom:22px; color:var(--gold); }
.nv-root .ai-card h4{ font-family:'Fraunces', serif; font-size:17px; font-weight:500; margin-bottom:10px; }
.nv-root .ai-card p{ font-size:13px; color:var(--gray); line-height:1.55; }

.nv-root .dash-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.nv-root .dash-card{ border:1px solid var(--line); padding:22px; }
.nv-root .dash-label{ font-size:11.5px; color:var(--gray); font-family:'JetBrains Mono',monospace; letter-spacing:.05em; }
.nv-root .dash-value{ font-family:'Fraunces', serif; font-size:26px; font-weight:600; margin-top:8px; }
.nv-root .dash-change{ font-family:'JetBrains Mono',monospace; font-size:12.5px; margin-top:6px; }

.nv-root .founder-section{ background: var(--ink-2); }
.nv-root .founder-grid{ display:grid; grid-template-columns: .78fr 1.22fr; gap:52px; align-items:start; }
.nv-root .avatar-plaque{
  border:1px solid var(--line-strong); background: var(--glass); padding:38px 30px; text-align:center;
  position:sticky; top:96px;
}
.nv-root .avatar-mono{
  width:104px; height:104px; margin:0 auto 22px; border-radius:50%;
  background: linear-gradient(145deg, var(--blue-deep), var(--blue));
  display:flex; align-items:center; justify-content:center;
  font-family:'Fraunces', serif; font-size:34px; font-weight:600; color:#fff; letter-spacing:.01em;
  border:1px solid rgba(255,255,255,.18);
}
.nv-root .avatar-name{ font-family:'Fraunces', serif; font-size:20px; font-weight:600; line-height:1.3; }
.nv-root .avatar-role{ font-size:12.5px; color:var(--gold); margin-top:8px; font-weight:600; }
.nv-root .avatar-org{ font-size:12px; color:var(--gray); margin-top:14px; font-family:'JetBrains Mono',monospace; letter-spacing:.04em; }
.nv-root .avatar-divider{ width:32px; height:1px; background:var(--line-strong); margin:20px auto; }
.nv-root .avatar-award{ font-size:11.5px; color:var(--gray); line-height:1.6; }
.nv-root .avatar-award b{ color:var(--paper); font-weight:600; }

.nv-root .founder-bio p{ font-size:14.5px; color:var(--gray); line-height:1.7; margin-bottom:16px; max-width:640px; }
.nv-root .founder-bio p b{ color:var(--paper); font-weight:600; }

.nv-root .founder-cols{ display:grid; grid-template-columns:1fr 1fr; gap:36px; margin-top:36px; }
.nv-root .founder-cols h5{ font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold); margin-bottom:16px; }
.nv-root .founder-cols ul{ list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:11px; }
.nv-root .founder-cols li{ font-size:13.5px; color:var(--paper); opacity:.85; display:flex; gap:10px; line-height:1.4; }
.nv-root .founder-cols li::before{ content:"—"; color:var(--blue); flex-shrink:0; }

.nv-root .vision-block{ margin-top:44px; padding:34px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
.nv-root .vision-block .eyebrow{ margin-bottom:16px; }
.nv-root .vision-quote{ font-family:'Fraunces', serif; font-style:italic; font-weight:500; font-size:22px; line-height:1.5; max-width:680px; letter-spacing:-.005em; }

.nv-root .philosophy-list{ margin-top:24px; display:flex; flex-direction:column; }
.nv-root .philosophy-row{ display:flex; align-items:baseline; gap:20px; padding:14px 0; border-bottom:1px solid var(--line); }
.nv-root .philosophy-row:first-child{ border-top:1px solid var(--line); }
.nv-root .philosophy-num{ font-family:'JetBrains Mono',monospace; font-size:11.5px; color:var(--gold); flex-shrink:0; width:24px; }
.nv-root .philosophy-text{ font-family:'Fraunces', serif; font-size:16.5px; font-weight:500; }

.nv-root .mission-block{ margin-top:44px; }
.nv-root .mission-block p{ font-size:13.5px; color:var(--gray); max-width:600px; line-height:1.6; margin-bottom:18px; }

.nv-root .newsletter{ text-align:center; padding:80px 0; }
.nv-root .newsletter h3{ font-family:'Fraunces', serif; font-size:34px; font-weight:600; max-width:640px; margin:0 auto 14px; letter-spacing:-.01em; }
.nv-root .newsletter p{ color:var(--gray); font-size:14.5px; max-width:480px; margin:0 auto 30px; }
.nv-root .news-form{ display:flex; justify-content:center; gap:10px; max-width:440px; margin:0 auto; }
.nv-root .news-form input{
  flex:1; padding:13px 18px; background:var(--glass); border:1px solid var(--line-strong); color:var(--paper); font-size:13.5px;
  font-family:inherit;
}
.nv-root .news-form input::placeholder{ color:var(--gray); }
.nv-root .news-form input:focus{ outline:2px solid var(--blue); outline-offset:0; }

.nv-root footer{ border-top:1px solid var(--line); padding:56px 0 30px; }
.nv-root .foot-grid{ display:grid; grid-template-columns:1.3fr repeat(4,1fr); gap:32px; margin-bottom:48px; }
.nv-root .foot-col h5{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--gray); margin-bottom:16px; font-family:'JetBrains Mono',monospace; }
.nv-root .foot-col a{ display:block; font-size:13.5px; margin-bottom:11px; color:var(--paper); opacity:.75; }
.nv-root .foot-col a:hover{ opacity:1; color:var(--gold); }
.nv-root .foot-bottom{ display:flex; justify-content:space-between; align-items:center; padding-top:28px; border-top:1px solid var(--line); font-size:12px; color:var(--gray); gap:16px; flex-wrap:wrap; }

.nv-root .reveal{ opacity:0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
.nv-root .reveal.in{ opacity:1; transform:none; }

@media (max-width: 1080px){
  .nv-root .wrap{ padding:0 24px; }
  .nv-root .hero-grid{ grid-template-columns:1fr; }
  .nv-root .grid-3{ grid-template-columns:repeat(2,1fr); }
  .nv-root .ai-grid{ grid-template-columns:repeat(2,1fr); }
  .nv-root .dash-grid{ grid-template-columns:repeat(2,1fr); }
  .nv-root .foot-grid{ grid-template-columns:repeat(3,1fr); }
  .nv-root .navlinks{ display:none; }
  .nv-root .founder-grid{ grid-template-columns:1fr; }
  .nv-root .avatar-plaque{ position:static; max-width:320px; }
  .nv-root .founder-cols{ grid-template-columns:1fr; }
}
@media (max-width: 640px){
  .nv-root .grid-3{ grid-template-columns:1fr; }
  .nv-root .ai-grid{ grid-template-columns:1fr; }
  .nv-root .dash-grid{ grid-template-columns:1fr 1fr; }
  .nv-root .foot-grid{ grid-template-columns:1fr 1fr; }
  .nv-root .hero-headline{ font-size:30px; }
  .nv-root .hero-media{ height:420px; }
  .nv-root .news-form{ flex-direction:column; }
  .nv-root .navactions .btn-ghost{ display:none; }
  .nv-root .logo-text{ display:none; }
  .nv-root .navbar{ height:64px; }
}
@media (prefers-reduced-motion: reduce){
  .nv-root *{ animation-duration:.001ms !important; transition-duration:.001ms !important; }
}
`;
