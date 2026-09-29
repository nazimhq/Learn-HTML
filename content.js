/* =====================================================================
   NEXAWEB — SITE CONTENT
   ---------------------------------------------------------------------
   Every word, price, link and project on the website lives in this file.
   Edit the text between the quotes, save, and refresh the page.
   You never need to touch index.html.

   Rules:
   - Keep the quotes "..." around text.
   - Keep the comma at the end of each line / item.
   - Anything marked [PLACEHOLDER] must be replaced before launch.
   See README.md for a line-by-line guide.
   ===================================================================== */

window.NEXAWEB = {

  /* ---------- BRAND ---------- */
  brand: {
    name: "NEXAWEB",
    tagline: "Websites and digital marketing for local businesses in Mymensingh."
  },

  /* ---------- SEO / SHARING ---------- */
  meta: {
    title: "NEXAWEB | Websites & Digital Marketing for Local Businesses in Mymensingh",
    description: "NEXAWEB builds fast websites, runs Facebook and Instagram ads, and sets up Google Business Profiles for doctors, dentists, restaurants, bakeries and shops in Mymensingh.",
    siteUrl: "https://nexaweb.io",
    ogImage: "https://nexaweb.io/og-image.png" // [PLACEHOLDER] upload a 1200x630 image with this name
  },

  /* ---------- CONTACT (used in every button and the footer) ---------- */
  contact: {
    whatsappNumber: "8801XXXXXXXXX",          // [PLACEHOLDER] digits only, country code first, no + or spaces
    whatsappMessage: "হ্যালো NEXAWEB, আমি আমার ব্যবসার জন্য ওয়েবসাইট ও মার্কেটিং নিয়ে কথা বলতে চাই।", // pre-filled WhatsApp message (the only text allowed in Bengali)
    phoneDisplay: "+880 1XXX-XXXXXX",         // [PLACEHOLDER] how the number is shown
    phoneLink: "+8801XXXXXXXXX",              // [PLACEHOLDER] same number, no spaces
    email: "hello@nexaweb.io",                // [PLACEHOLDER] confirm this inbox exists
    facebookUrl: "https://facebook.com/",     // [PLACEHOLDER] your Facebook page link
    website: "nexaweb.io",
    location: "Mymensingh, Bangladesh"
  },

  /* ---------- TOP NAVIGATION ---------- */
  nav: {
    links: [
      { label: "Services", href: "#services" },
      { label: "Process",  href: "#process" },
      { label: "Work",     href: "#work" },
      { label: "Packages", href: "#packages" },
      { label: "FAQ",      href: "#faq" }
    ],
    ctaLabel: "Talk on WhatsApp"
  },

  /* ---------- HERO (top of the page) ---------- */
  hero: {
    eyebrow: "Web design & marketing in Mymensingh",
    headline: "Get found by customers who are already looking for you.",
    subline: "We build websites, run Facebook and Instagram ads, and fix your Google listing. For doctors, dentists, restaurants, bakeries and shops in Mymensingh.",
    primaryCta: "Talk on WhatsApp",
    secondaryCta: "See packages",
    note: "No forms. Just send us a message.",
    // The small search-result illustration on the right
    mock: {
      query: "dentist near me",
      name: "Your Business Name",
      detail: "Dental clinic · Mymensingh",
      status: "Open now",
      actions: ["Website", "Directions", "WhatsApp"]
    }
  },

  /* ---------- PROBLEM ---------- */
  problem: {
    eyebrow: "The problem",
    heading: "Good businesses lose customers when people can't find them online.",
    intro: "Most people search on their phone before they visit, call or order. Here is what that costs when your details aren't there.",
    items: [
      { icon: "search", title: "People search. You don't show up.", text: "Someone nearby searches for a dentist or a place to eat. They choose from what Google shows them. If you're not there, they call someone else." },
      { icon: "clock",  title: "Wrong hours, no map pin.", text: "Old opening hours or a missing location send people to a closed door. Most of them won't come back to check again." },
      { icon: "message", title: "Your Facebook page does all the work.", text: "Old posts and no clear prices make people guess. Many won't message to ask. They just scroll to the next page." },
      { icon: "coins",  title: "Boosting posts without a plan.", text: "A boost here and there feels like progress. Without targeting and tracking, you can't tell if it brought in a single customer." }
    ]
  },

  /* ---------- SERVICES ---------- */
  services: {
    eyebrow: "Services",
    heading: "What we do for you",
    intro: "Five services that work together. Take one, or let us handle all of it.",
    // icon options: globe, megaphone, map-pin, wrench, pen, search, clock, message, coins, users, chart, door, phone, mail
    items: [
      { icon: "globe",     title: "Web Design", text: "A fast website that shows what you do, your prices and how to reach you. Built for phones first." },
      { icon: "megaphone", title: "Meta Ads Management", text: "Facebook and Instagram ads aimed at people near you. We set them up, watch them and adjust them every week." },
      { icon: "map-pin",   title: "Google Business Profile Optimization", text: "Correct hours, photos, services and map pin, so you appear when people nearby search on Google." },
      { icon: "wrench",    title: "Monthly Maintenance", text: "Updates, backups and fixes every month. Tell us what to change and we'll change it." },
      { icon: "pen",       title: "Content Support", text: "Post designs, captions and offers for your page, written the way your customers talk." }
    ]
  },

  /* ---------- PROCESS ---------- */
  process: {
    eyebrow: "How it works",
    heading: "Four steps from first message to launch",
    steps: [
      { title: "Talk", text: "Message us on WhatsApp. We ask about your business, your customers and what you want more of." },
      { title: "Plan", text: "We suggest a package and a written plan of what we'll do each month. No surprises." },
      { title: "Build", text: "We build your website, fix your Google profile and set up your ads. You approve before anything goes live." },
      { title: "Launch & Maintain", text: "We go live, then keep everything running. Every month you get a short report." }
    ]
  },

  /* ---------- WHY NEXAWEB ---------- */
  why: {
    eyebrow: "Why NEXAWEB",
    heading: "A team you can actually reach",
    intro: "You run a business. You shouldn't have to chase your marketing agency.",
    items: [
      { icon: "map-pin", title: "Local team", text: "We're based in Mymensingh. We know the area, and we can meet you in person." },
      { icon: "message", title: "Direct support", text: "You talk to the people doing the work, on WhatsApp. No ticket system, no call centre." },
      { icon: "chart",   title: "Monthly reporting", text: "A short, plain report every month: what we did, what the ads spent and what came in." },
      { icon: "door",    title: "Cancel anytime", text: "Monthly packages run month to month. If it isn't working for you, you can stop." }
    ]
  },

  /* ---------- WORK / PROJECTS ---------- */
  work: {
    eyebrow: "Work",
    heading: "Recent projects",
    intro: "A selection of sites and campaigns. More case studies coming soon.",
    sampleLabel: "Sample",
    // Add, remove or reorder projects here.
    // image: path to a screenshot (e.g. "images/project-1.jpg") or "" for a gradient card.
    // link:  full URL to the live project, or "" if there is none.
    // sample: true shows a "Sample" badge. Set to false for real projects.
    projects: [
      { title: "Clinic website", category: "Healthcare", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Website", "Google Profile"], image: "", link: "", sample: true },
      { title: "Restaurant launch campaign", category: "Food & dining", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Meta Ads", "Content"], image: "", link: "", sample: true },
      { title: "Bakery order page", category: "Food & dining", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Website", "WhatsApp orders"], image: "", link: "", sample: true },
      { title: "Dental practice listing", category: "Healthcare", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Google Profile"], image: "", link: "", sample: true },
      { title: "Retail store website", category: "Retail", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Website", "Maintenance"], image: "", link: "", sample: true },
      { title: "Seasonal offer ads", category: "Retail", summary: "[PLACEHOLDER] Example entry. Replace with a real project summary.", tags: ["Meta Ads"], image: "", link: "", sample: true }
    ]
  },

  /* ---------- PACKAGES & PRICES ---------- */
  packages: {
    eyebrow: "Packages",
    heading: "Simple monthly packages",
    intro: "One clear price each month. Pick the level that fits where your business is right now.",
    period: "/ month",
    popularBadge: "Most Popular",
    tiers: [
      {
        name: "Starter",
        price: "BDT 15,000",
        summary: "Get your business visible and looking right.",
        highlighted: false,
        includesPrevious: "",
        ctaLabel: "Start with Starter",
        features: [
          "Google Business Profile setup and monthly updates",
          "1 Meta ad campaign, set up and managed",
          "8 social media post designs per month",
          "Website updates and backups",
          "Monthly report on WhatsApp",
          "WhatsApp support during working hours"
        ]
      },
      {
        name: "Growth",
        price: "BDT 25,000",
        summary: "For businesses ready to bring in steady new customers.",
        highlighted: true,
        includesPrevious: "Everything in Starter, plus:",
        ctaLabel: "Choose Growth",
        features: [
          "Up to 3 Meta ad campaigns at a time",
          "15 post designs per month, with captions",
          "Weekly ad checks and adjustments",
          "Ads that reach people who already visited your page",
          "Monthly review call",
          "Same-day replies on working days"
        ]
      },
      {
        name: "Dominate",
        price: "BDT 37,000",
        summary: "Full marketing support for busy, growing businesses.",
        highlighted: false,
        includesPrevious: "Everything in Growth, plus:",
        ctaLabel: "Choose Dominate",
        features: [
          "Up to 5 Meta ad campaigns at a time",
          "25 post designs per month",
          "4 short video edits per month (from your footage)",
          "A simple way to ask happy customers for Google reviews",
          "1 offer landing page per month",
          "Report and review call every two weeks",
          "Priority support"
        ]
      }
    ],
    oneTime: {
      label: "One-time option",
      name: "Website (one-time)",
      price: "BDT 25,000",
      note: "Free when you sign a 6-month contract on any monthly package.",
      features: [
        "Up to 5 pages",
        "Built for phones first",
        "WhatsApp and call buttons",
        "Google Map and opening hours",
        "Basic on-page SEO",
        "2 rounds of changes before launch"
      ],
      ctaLabel: "Ask about a website"
    },
    disclaimer: "Meta ad spend is paid from your own ad budget and is not included in the package price."
  },

  /* ---------- FAQ ---------- */
  faq: {
    eyebrow: "FAQ",
    heading: "Questions we get asked",
    items: [
      { q: "Is the ad budget included in the package price?", a: "No. The package covers our work: planning, setup, design and management. The money Facebook and Instagram charge to show your ads comes from your own budget, paid directly to Meta. We'll suggest a budget that fits your goals." },
      { q: "Do I need a website to get started?", a: "No. Many businesses start with a Google Business Profile and Facebook ads. When you're ready for a website, we can build one. It's free if you sign a 6-month contract." },
      { q: "How long does a new website take?", a: "It depends on how many pages you need and how quickly we get your text and photos. We give you a clear timeline before we start, and we stick to it." },
      { q: "Can I cancel?", a: "Yes. Monthly packages run month to month. If you took the free website with a 6-month contract, that contract applies. We explain the terms clearly before you sign anything." },
      { q: "Who owns my website and pages?", a: "You do. Your domain, your Facebook page and your ad account stay in your name. We work inside them with your permission." },
      { q: "I'm not in Mymensingh. Can you still help?", a: "Yes. We focus on local businesses here, but we can do everything over WhatsApp and video call." }
    ]
  },

  /* ---------- FINAL CALL TO ACTION ---------- */
  finalCta: {
    headline: "Let's get your business found.",
    text: "Send us a message on WhatsApp. Tell us what you do, and we'll reply with a plan and a price.",
    button: "Talk on WhatsApp"
  },

  /* ---------- FOOTER ---------- */
  footer: {
    contactHeading: "Contact",
    navHeading: "On this page",
    copyrightName: "NEXAWEB",
    rights: "All rights reserved."
    // The year updates automatically.
  }
};
