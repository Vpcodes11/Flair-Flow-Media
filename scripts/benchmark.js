
const NUM_ELEMENTS = 100;

// Mocking the DOM environment
global.window = {
    innerHeight: 800,
    scrollY: 0,
};

class MockElement {
    constructor(id) {
        this.id = id;
        this.dataset = { parallax: "0.2", scroll: "drift" };
        this.style = { transform: "" };
    }

    getBoundingClientRect() {
        // Simulate the cost of layout calculation (layout thrashing trigger)
        let sum = 0;
        for (let i = 0; i < 1000; i++) sum += Math.sqrt(i);
        return {
            top: 100 + this.id * 50 - global.window.scrollY,
            height: 100
        };
    }
}

const parallaxItems = Array.from({ length: NUM_ELEMENTS }, (_, i) => new MockElement(i));
const scrollSyncItems = Array.from({ length: NUM_ELEMENTS }, (_, i) => new MockElement(i));

// --- ORIGINAL LOGIC (interleaved read/write) ---
function originalOnScroll() {
    parallaxItems.forEach((el) => {
        const rect = el.getBoundingClientRect(); // READ
        const viewport = global.window.innerHeight || 1;
        const progress = Math.min(
            Math.max((viewport - rect.top) / (viewport + rect.height), 0),
            1
        );
        const strength = parseFloat(el.dataset.parallax || "0.2");
        const maxShift = 90 * strength;
        const offset = (progress - 0.5) * 2 * maxShift;
        el.style.transform = `translate3d(0, ${offset}px, 0)`; // WRITE
    });

    scrollSyncItems.forEach((el) => {
        const rect = el.getBoundingClientRect(); // READ
        const viewport = global.window.innerHeight || 1;
        const progress = Math.min(
            Math.max((viewport - rect.top) / (viewport + rect.height), 0),
            1
        );
        const drift = (0.5 - progress) * 30;
        const mode = el.dataset.scroll || "fade-up";
        if (mode === "drift") {
            el.style.transform = `translate3d(0, ${drift}px, 0)`; // WRITE
        } else if (mode === "tilt") {
            const rotate = (progress - 0.5) * 4;
            el.style.transform = `translate3d(0, ${drift}px, 0) rotateX(${rotate}deg)`; // WRITE
        } else {
            el.style.transform = `translate3d(0, ${drift}px, 0)`; // WRITE
        }
    });
}

// --- OPTIMIZED LOGIC (using cache) ---
let cachedParallax = [];
let cachedScrollSync = [];
let viewportHeight = 800;

const cachePositions = () => {
  parallaxItems.forEach((el) => (el.style.transform = ""));
  scrollSyncItems.forEach((el) => (el.style.transform = ""));

  viewportHeight = global.window.innerHeight || 1;
  const scrollY = global.window.scrollY;

  cachedParallax = parallaxItems.map((el) => {
    const rect = el.getBoundingClientRect();
    const strength = parseFloat(el.dataset.parallax || "0.2");
    return {
      el,
      top: rect.top + scrollY,
      height: rect.height,
      maxShift: 90 * strength,
    };
  });

  cachedScrollSync = scrollSyncItems.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      top: rect.top + scrollY,
      height: rect.height,
      mode: el.dataset.scroll || "fade-up",
    };
  });
};

const applyParallax = (scrollY) => {
  cachedParallax.forEach((data) => {
    const rectTop = data.top - scrollY;
    const progress = Math.min(
      Math.max((viewportHeight - rectTop) / (viewportHeight + data.height), 0),
      1
    );
    const offset = (progress - 0.5) * 2 * data.maxShift;
    data.el.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
};

const applyScrollSync = (scrollY) => {
  cachedScrollSync.forEach((data) => {
    const rectTop = data.top - scrollY;
    const progress = Math.min(
      Math.max((viewportHeight - rectTop) / (viewportHeight + data.height), 0),
      1
    );
    const drift = (0.5 - progress) * 30;
    if (data.mode === "drift") {
      data.el.style.transform = `translate3d(0, ${drift}px, 0)`;
    } else if (data.mode === "tilt") {
      const rotate = (progress - 0.5) * 4;
      data.el.style.transform = `translate3d(0, ${drift}px, 0) rotateX(${rotate}deg)`;
    } else {
      data.el.style.transform = `translate3d(0, ${drift}px, 0)`;
    }
  });
};

function optimizedOnScroll() {
    const scrollY = global.window.scrollY;
    applyParallax(scrollY);
    applyScrollSync(scrollY);
}

// --- BENCHMARKING ---
const iterations = 1000;

console.log(`Running benchmark with ${NUM_ELEMENTS} elements and ${iterations} iterations...`);

// Baseline
const startBaseline = Date.now();
for (let i = 0; i < iterations; i++) {
    global.window.scrollY = i % 500;
    originalOnScroll();
}
const endBaseline = Date.now();
console.log(`Baseline (Original): ${endBaseline - startBaseline}ms`);

// Optimized
cachePositions();
const startOptimized = Date.now();
for (let i = 0; i < iterations; i++) {
    global.window.scrollY = i % 500;
    optimizedOnScroll();
}
const endOptimized = Date.now();
console.log(`Optimized: ${endOptimized - startOptimized}ms`);

const improvement = ((endBaseline - startBaseline) - (endOptimized - startOptimized)) / (endBaseline - startBaseline) * 100;
console.log(`Improvement: ${improvement.toFixed(2)}%`);

if (improvement < 0) {
    console.error("Optimization is slower!");
    process.exit(1);
}
