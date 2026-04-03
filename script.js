const revealEls = document.querySelectorAll('.reveal');
const topbar = document.querySelector('.topbar');
const parallaxEls = document.querySelectorAll('[data-parallax]');
const tiltTargets = document.querySelectorAll('[data-tilt]');
const scrollLight = document.querySelector('.scroll-light');
const scrollProgress = document.getElementById('scroll-progress');
const heroFloatField = document.getElementById('hero-float-field');
const terminalCode = document.getElementById('terminal-code');
const robotCode = document.getElementById('robot-code');
const endcapCode = document.getElementById('endcap-code');
const buttons = document.querySelectorAll('.button');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const codeLines = [
  '<span class="line-comment">// Most innovative companies are leaking value they should be compounding</span>',
  '<span class="line-key">scan</span>(<span class="line-value">code</span>, <span class="line-value">data</span>, <span class="line-value">technical_workflows</span>, <span class="line-value">founder_know_how</span>);',
  '<span class="line-key">extract</span>(<span class="line-value">hidden_enterprise_value</span>);',
  '<span class="line-key">map</span>(<span class="line-value">strategic_ip</span> -&gt; <span class="line-value">valuation</span>, <span class="line-value">licensing</span>, <span class="line-value">leverage</span>);',
  '<span class="line-key">install</span>(<span class="line-value">commercial_leverage</span>);',
  '<span class="line-accent">result:</span> stronger moat, sharper fundraising story, better buyer leverage'
];
const robotLines = [
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Biotech</span> <span class="ai-code-value">drug formula patents</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Medical devices</span> <span class="ai-code-value">surgical tool IP</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Semiconductors</span> <span class="ai-code-value">chip design patents</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Software & AI</span> <span class="ai-code-value">model system patents</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Telecommunications</span> <span class="ai-code-value">network movement patents</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Consumer</span> <span class="ai-code-value">smartphone feature patents</span></span>',
  '<span class="ai-code-line"><span class="ai-code-key">industry</span>: <span class="ai-code-industry">Automotive</span> <span class="ai-code-value">battery and self-driving IP</span></span>'
];
const endcapLines = [
  '<span class="line-comment">// final step</span>',
  '<span class="line-key">book</span>(<span class="line-value">session</span>);',
  '<span class="line-key">find</span>(<span class="line-value">hidden_value</span>);',
  '<span class="line-key">unlock</span>(<span class="line-value">revenue</span>, <span class="line-value">valuation</span>, <span class="line-value">leverage</span>);',
  '<span class="line-accent">location:</span> 178 Broadway, New York',
  '<span class="line-accent">contact:</span> +1 (571) 380-7699'
];

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.14 });
revealEls.forEach((el) => observer.observe(el));

let tick = false;
let lastY = 0;
const onScroll = () => {
  const y = window.scrollY;
  if (topbar) {
    const active = y > 12;
    topbar.style.background = 'transparent';
    topbar.style.borderBottom = '1px solid transparent';
    topbar.classList.toggle('is-scrolled', active);
    if (!reduce) {
      topbar.classList.toggle('is-hidden', y > lastY && y > 140);
    }
  }

  if (scrollLight) {
    const pct = Math.min(90, 15 + (y / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 70);
    document.documentElement.style.setProperty('--light-y', `${pct}%`);
  }

  if (scrollProgress) {
    const progress = ((y / Math.max(1, document.body.scrollHeight - window.innerHeight)) * 100).toFixed(2);
    document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
  }

  parallaxEls.forEach((el) => {
    const speed = Number(el.dataset.parallax || 0.04);
    const rect = el.getBoundingClientRect();
    const offset = (window.innerHeight - rect.top) * speed;
    el.style.transform = `translate3d(0, ${Math.max(-10, Math.min(40, offset))}px, 0)`;
  });

  document.querySelectorAll('.scroll-section').forEach((section) => {
    const rect = section.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
    const scale = 0.985 + progress * 0.015;
    section.style.opacity = 0.82 + progress * 0.18;
    section.style.transform = `translate3d(0, ${(1 - progress) * 16}px, 0) scale(${scale})`;
  });

  const heroStage = document.querySelector('.terminal-shell');
  const heroWrap = document.querySelector('.terminal-stage');
  if (heroStage && heroWrap) {
    const rect = heroWrap.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight * 1.2)));
    const scale = 1 + progress * 0.12;
    document.documentElement.style.setProperty('--terminal-scale', scale.toFixed(3));
  }

  const systemSection = document.querySelector('.model-grid');
  if (systemSection) {
    const rect = systemSection.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
    const shift = ((progress - 0.5) * 40).toFixed(2);
    const rotate = ((progress - 0.5) * 26).toFixed(2);
    const scaleVar = (Math.abs(progress - 0.5) * 0.18).toFixed(3);
    document.documentElement.style.setProperty('--system-shift', `${shift}px`);
    document.documentElement.style.setProperty('--system-rotate', `${rotate}deg`);
    document.documentElement.style.setProperty('--system-scale', scaleVar);
  }

  lastY = y;
  tick = false;
};
window.addEventListener('scroll', () => {
  if (!tick) {
    requestAnimationFrame(onScroll);
    tick = true;
  }
}, { passive: true });
onScroll();

window.addEventListener('pointermove', (event) => {
  document.documentElement.style.setProperty('--light-x', `${(event.clientX / window.innerWidth) * 100}%`);
  if (!reduce && heroFloatField) {
    const x = (event.clientX / window.innerWidth - 0.5) * 20;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;
    document.documentElement.style.setProperty('--hero-shift-x', `${x}px`);
    document.documentElement.style.setProperty('--hero-shift-y', `${y}px`);
  }
});

function startTyping(targetEl, lines, rich = false) {
  if (!targetEl) return;
  let currentLine = 0;
  let currentChar = 0;
  let rendered = [];

  const typeNext = () => {
    if (currentLine >= lines.length) {
      setTimeout(() => {
        currentLine = 0;
        currentChar = 0;
        rendered = [];
        targetEl.innerHTML = '';
        typeNext();
      }, 1600);
      return;
    }

    const source = lines[currentLine];
    const plainTextLine = rich ? source.replace(/<[^>]+>/g, '') : source;
    currentChar += 1;
    if (currentChar > plainTextLine.length) {
      rendered.push(source);
      targetEl.innerHTML = rendered.join('<br>');
      currentLine += 1;
      currentChar = 0;
      setTimeout(typeNext, 220);
      return;
    }

    rendered[currentLine] = plainTextLine.slice(0, currentChar)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    targetEl.innerHTML = rendered.join('<br>');
    setTimeout(typeNext, 26 + Math.random() * 18);
  };

  if (reduce) {
    targetEl.innerHTML = lines.join('<br>');
  } else {
    typeNext();
  }
}

startTyping(terminalCode, codeLines, true);
startTyping(robotCode, robotLines, true);
startTyping(endcapCode, endcapLines, true);

const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

if (contactForm) {
  contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(contactForm).entries());
    formStatus.textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) throw new Error('Failed');
      formStatus.textContent = 'Message captured. Email/database delivery will be connected next.';
      contactForm.reset();
    } catch {
      formStatus.textContent = 'Form is not fully connected yet. Backend credentials still need to be added.';
    }
  });
}

if (!reduce) {
  tiltTargets.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1100px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-4px)`;
      card.style.boxShadow = '0 26px 56px rgba(35, 88, 196, 0.16)';
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });

  buttons.forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      button.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`;
    });
    button.addEventListener('pointerleave', () => {
      button.style.transform = '';
    });
  });
}

/* ── CEO Testimonial Carousel ── */
(function () {
  const slides = document.querySelectorAll('.ceo-slide');
  const dots = document.querySelectorAll('.ceo-dot');
  if (!slides.length) return;

  let current = 0;
  let interval;
  const DURATION = 5000;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = index % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }

  function startAuto() {
    clearInterval(interval);
    interval = setInterval(next, DURATION);
  }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () {
      goTo(i);
      startAuto();
    });
  });

  startAuto();
})();
