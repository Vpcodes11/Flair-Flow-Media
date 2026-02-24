const nav = document.querySelector(".nav");
const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelectorAll(".nav__links a");
const loader = document.getElementById("loader");
const loaderBar = loader ? loader.querySelector(".loader__bar span") : null;
const loaderPercent = loader ? loader.querySelector(".loader__percent") : null;

const toggleMenu = () => {
  const isOpen = nav.classList.toggle("nav--open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
};

navToggle.addEventListener("click", toggleMenu);
navLinks.forEach((link) =>
  link.addEventListener("click", () => nav.classList.remove("nav--open"))
);

const revealElements = document.querySelectorAll(".reveal");
const statCounters = document.querySelectorAll("[data-count]");
const parallaxItems = document.querySelectorAll("[data-parallax]");
const scrollSyncItems = document.querySelectorAll("[data-scroll]");

let cachedParallax = [];
let cachedScrollSync = [];
let viewportHeight = window.innerHeight;

const cachePositions = () => {
  // Reset transforms to get natural positions
  parallaxItems.forEach((el) => (el.style.transform = ""));
  scrollSyncItems.forEach((el) => (el.style.transform = ""));

  viewportHeight = window.innerHeight || 1;
  const scrollY = window.scrollY;

  cachedParallax = Array.from(parallaxItems).map((el) => {
    const rect = el.getBoundingClientRect();
    const strength = parseFloat(el.dataset.parallax || "0.2");
    return {
      el,
      top: rect.top + scrollY,
      height: rect.height,
      maxShift: 90 * strength,
    };
  });

  cachedScrollSync = Array.from(scrollSyncItems).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      top: rect.top + scrollY,
      height: rect.height,
      mode: el.dataset.scroll || "fade-up",
    };
  });
};

const toNumber = (value) => {
  if (String(value).includes(".")) return Number(value);
  return parseInt(value, 10);
};

const animateCount = (el) => {
  const target = toNumber(el.dataset.count);
  const duration = 1600;
  const start = performance.now();
  const isDecimal = String(el.dataset.count).includes(".");

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const current = target * progress;
    el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        if (entry.target.hasAttribute("data-count")) {
          animateCount(entry.target);
        }
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

revealElements.forEach((el) => observer.observe(el));
statCounters.forEach((el) => observer.observe(el));

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

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollY = window.scrollY;
    applyParallax(scrollY);
    applyScrollSync(scrollY);
    ticking = false;
  });
};

const handleResize = () => {
  cachePositions();
  const scrollY = window.scrollY;
  applyParallax(scrollY);
  applyScrollSync(scrollY);
};

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", handleResize);
cachePositions();
const initialScrollY = window.scrollY;
applyParallax(initialScrollY);
applyScrollSync(initialScrollY);

const form = document.querySelector(".cta__form");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const button = form.querySelector("button");
    const status = document.querySelector(".form-status");
    const original = button.textContent;
    button.textContent = "Sending...";
    button.disabled = true;
    if (status) {
      status.textContent = "";
      status.classList.remove("is-error", "is-success");
    }

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }
      form.reset();
      button.textContent = "Request received";
      if (status) {
        status.textContent = "Thanks! We will be in touch shortly.";
        status.classList.add("is-success");
      }
    } catch (err) {
      button.textContent = "Try again";
      if (status) {
        status.textContent = "Something went wrong. Please try again.";
        status.classList.add("is-error");
      }
    } finally {
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 2200);
    }
  });
}

window.addEventListener("load", () => {
  if (!loader) return;
  const finalize = () => {
    loader.classList.add("is-hidden");
    setTimeout(() => {
      loader.remove();
      // Re-cache positions once fully loaded and loader removed
      cachePositions();
      const scrollY = window.scrollY;
      applyParallax(scrollY);
      applyScrollSync(scrollY);
    }, 700);
  };

  let progress = 0;
  const tick = () => {
    progress = Math.min(progress + Math.random() * 6 + 4, 100);
    if (loaderBar) loaderBar.style.width = `${progress}%`;
    if (loaderPercent) loaderPercent.textContent = `${Math.floor(progress)}%`;
    if (progress < 100) {
      setTimeout(() => requestAnimationFrame(tick), 120);
    } else {
      setTimeout(finalize, 650);
    }
  };

  requestAnimationFrame(tick);
});
