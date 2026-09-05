// ============================================================
//  FAJRIANSYAH ADITHAMA — PORTFOLIO SCRIPT (BUG-FIXED)
// ============================================================

(function () {
  'use strict';

  // ===== DATA =====

  const universities = [
    { name: 'UGM', full: 'Universitas Gadjah Mada', loc: 'Yogyakarta', color: '#1e40af', bg: '#eff6ff', seed: 'ugm-logo-id', tag: 'Top #1' },
    { name: 'ITS', full: 'Institut Teknologi Sepuluh Nopember', loc: 'Surabaya', color: '#b91c1c', bg: '#fef2f2', seed: 'its-logo-id', tag: 'Engineering' },
    { name: 'UNAIR', full: 'Universitas Airlangga', loc: 'Surabaya', color: '#15803d', bg: '#f0fdf4', seed: 'unair-logo-id', tag: 'Medical' },
    { name: 'UB', full: 'Universitas Brawijaya', loc: 'Malang', color: '#7c3aed', bg: '#f5f3ff', seed: 'ub-logo-id', tag: 'Research' },
    { name: 'UNESA', full: 'Universitas Negeri Surabaya', loc: 'Surabaya', color: '#0369a1', bg: '#f0f9ff', seed: 'unesa-logo-id', tag: 'Education' },
    { name: 'UI', full: 'Universitas Indonesia', loc: 'Depok', color: '#f59e0b', bg: '#fffbeb', seed: 'ui-logo-id', tag: 'Top #2' },
    { name: 'ITB', full: 'Institut Teknologi Bandung', loc: 'Bandung', color: '#0d9488', bg: '#f0fdfa', seed: 'itb-logo-id', tag: 'Innovation' },
    { name: 'UNDIP', full: 'Universitas Diponegoro', loc: 'Semarang', color: '#dc2626', bg: '#fef2f2', seed: 'undip-logo-id', tag: 'Comprehensive' },
    { name: 'UM', full: 'Universitas Negeri Malang', loc: 'Malang', color: '#2563eb', bg: '#eff6ff', seed: 'um-malang-logo', tag: 'Education' },
    { name: 'Ubaya', full: 'Universitas Surabaya', loc: 'Surabaya', color: '#ea580c', bg: '#fff7ed', seed: 'ubaya-logo-id', tag: 'Private' },
  ];

  const skills = [
    { name: 'JavaScript / TypeScript', pct: 90 },
    { name: 'React / Next.js', pct: 85 },
    { name: 'Node.js / Express', pct: 80 },
    { name: 'Python / Django', pct: 75 },
    { name: 'UI/UX Design', pct: 85 },
    { name: 'Database / SQL', pct: 70 },
  ];

  const techStack = [
    ['⚛️', 'React'], ['🟢', 'Node.js'], ['🐍', 'Python'],
    ['🎨', 'Figma'], ['🐳', 'Docker'], ['☁️', 'AWS'],
    ['📱', 'Flutter'], ['🗄️', 'PostgreSQL'], ['🔥', 'Firebase'],
  ];

  const journey = [
    { year: '2024 — Present', color: '#f43f5e', bg: '#fff1f2', title: 'University Student — Computer Science', desc: 'Pursuing a degree in Computer Science at a prestigious Indonesian university. Active in coding communities and tech organizations.' },
    { year: '2023', color: '#fb923c', bg: '#fff7ed', title: 'Freelance Developer', desc: 'Started taking on freelance projects, building web applications and mobile apps for local businesses and startups.' },
    { year: '2022', color: '#22c55e', bg: '#f0fdf4', title: 'First Programming Course', desc: 'Discovered the world of programming and immediately fell in love. Built the first "Hello World" and never looked back.' },
    { year: '2021', color: '#6366f1', bg: '#eef2ff', title: 'High School — Science Track', desc: 'Focused on mathematics and science. Participated in national science olympiads and developed a strong analytical foundation.' },
  ];


  // ===== TOAST =====

  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  let toastTimer = null;

  function showToast(message, icon, duration) {
    icon = icon || '✅';
    duration = duration || 3000;
    toastMsg.textContent = message;
    toastIcon.textContent = icon;

    // FIX: Clear any existing timer so toasts don't overlap
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.classList.remove('show');

    // Force reflow so the remove->add triggers the animation
    void toastEl.offsetWidth;

    toastEl.classList.add('show');
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
      toastTimer = null;
    }, duration);
  }


  // ===== PARTICLES =====

  var particlesContainer = document.getElementById('particles');
  var particleColors = ['rgba(244,63,94,0.15)', 'rgba(251,146,60,0.12)', 'rgba(168,85,247,0.1)', 'rgba(34,211,238,0.08)'];

  for (var i = 0; i < 25; i++) {
    var p = document.createElement('div');
    p.className = 'particle';
    var size = Math.random() * 6 + 2;
    p.style.cssText =
      'width:' + size + 'px;height:' + size + 'px;' +
      'left:' + (Math.random() * 100) + '%;' +
      'top:' + (Math.random() * 100) + '%;' +
      'background:' + particleColors[Math.floor(Math.random() * particleColors.length)] + ';' +
      'animation-delay:' + (-(Math.random() * 6)) + 's;' +
      'animation-duration:' + (Math.random() * 4 + 4) + 's;';
    particlesContainer.appendChild(p);
  }


  // ===== BUILD UNIVERSITY SLIDER =====
  // FIX #1: No more duplication — use proper wrap-around logic

  var sliderTrack = document.getElementById('uni-slider-track');
  var dotsContainer = document.getElementById('slider-dots');
  var sliderViewport = document.getElementById('uni-slider-viewport');

  universities.forEach(function (uni, idx) {
    var slide = document.createElement('div');
    slide.className = 'uni-slide';
    slide.setAttribute('tabindex', '0');
    slide.setAttribute('role', 'button');
    slide.innerHTML =
      '<div class="uni-slide-img-wrap" style="background:' + uni.bg + '">' +
        '<img src="https://picsum.photos/seed/' + uni.seed + '/200/200.jpg" alt="' + uni.name + ' Logo" class="uni-slide-logo" loading="lazy" />' +
      '</div>' +
      '<div class="uni-slide-info">' +
        '<div class="uni-slide-name">' + uni.name + '</div>' +
        '<div class="uni-slide-loc">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          uni.loc +
        '</div>' +
        '<span class="uni-slide-tag" style="background:' + uni.bg + ';color:' + uni.color + '">' + uni.tag + '</span>' +
      '</div>';
    slide.addEventListener('click', function () {
      showToast(uni.full + ' — ' + uni.loc, '🎓');
    });
    // Keyboard accessibility
    slide.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); slide.click(); }
    });
    sliderTrack.appendChild(slide);
  });

  // Slider state
  var currentSlide = 0;
  var totalSlides = universities.length;
  var autoSlideInterval = null;

  // FIX #2: Compute slidesPerView reliably
  function getSlidesPerView() {
    var w = window.innerWidth;
    if (w < 768) return 1;
    if (w < 1024) return 2;
    return 3;
  }

  // FIX #2: Cache slide width with null check
  function getSlideWidth() {
    var first = sliderTrack.children[0];
    if (!first) return 304; // fallback: 280 + 24 gap
    return first.offsetWidth + 24;
  }

  var maxSlide = Math.max(0, totalSlides - getSlidesPerView());

  // Build dots
  function buildDots() {
    dotsContainer.innerHTML = '';
    maxSlide = Math.max(0, totalSlides - getSlidesPerView());
    for (var i = 0; i <= maxSlide; i++) {
      var dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === currentSlide ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      (function (index) {
        dot.addEventListener('click', function () { goToSlide(index); });
      })(i);
      dotsContainer.appendChild(dot);
    }
  }
  buildDots();

  function updateDots() {
    var dots = dotsContainer.querySelectorAll('.slider-dot');
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === currentSlide);
    });
  }

  // FIX #7: Seamless wrap-around
  function goToSlide(index) {
    maxSlide = Math.max(0, totalSlides - getSlidesPerView());

    // Wrap around
    if (index > maxSlide) index = 0;
    if (index < 0) index = maxSlide;

    currentSlide = index;
    var slideWidth = getSlideWidth();
    sliderTrack.style.transform = 'translateX(-' + (currentSlide * slideWidth) + 'px)';
    updateDots();
  }

  // FIX #3: Reset auto-slide timer on every manual interaction
  function resetAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(function () {
      var next = currentSlide + 1;
      goToSlide(next > maxSlide ? 0 : next);
    }, 4000);
  }

  document.getElementById('slider-prev').addEventListener('click', function () {
    goToSlide(currentSlide - 1);
    resetAutoSlide();
  });
  document.getElementById('slider-next').addEventListener('click', function () {
    goToSlide(currentSlide + 1);
    resetAutoSlide();
  });

  // Start auto-slide
  resetAutoSlide();

  // Pause on hover
  sliderViewport.addEventListener('mouseenter', function () {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
  });
  sliderViewport.addEventListener('mouseleave', function () {
    resetAutoSlide();
  });

  // FIX #11: Better touch swipe with Y-axis lock
  var touchStartX = 0;
  var touchStartY = 0;
  var touchTracking = false;

  sliderViewport.addEventListener('touchstart', function (e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    touchTracking = true;
  }, { passive: true });

  sliderViewport.addEventListener('touchend', function (e) {
    if (!touchTracking) return;
    touchTracking = false;
    var dx = touchStartX - e.changedTouches[0].screenX;
    var dy = touchStartY - e.changedTouches[0].screenY;

    // Only trigger if horizontal swipe is dominant and > 80px
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) goToSlide(currentSlide + 1);
      else goToSlide(currentSlide - 1);
      resetAutoSlide();
    }
  }, { passive: true });


  // ===== BUILD SKILLS =====

  var skillsBarsCol = document.getElementById('skills-bars-col');
  var skillsTechCol = document.getElementById('skills-tech-col');

  skills.forEach(function (skill) {
    var item = document.createElement('div');
    item.className = 'skill-item';
    item.innerHTML =
      '<div class="skill-header">' +
        '<span class="skill-name">' + skill.name + '</span>' +
        '<span class="skill-pct" data-value="' + skill.pct + '">0%</span>' +
      '</div>' +
      '<div class="skill-bar">' +
        '<div class="skill-bar-fill" data-width="' + skill.pct + '"></div>' +
      '</div>';
    skillsBarsCol.appendChild(item);
  });

  techStack.forEach(function (tech) {
    var card = document.createElement('div');
    card.className = 'tech-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.innerHTML = '<span class="tech-emoji">' + tech[0] + '</span><span class="tech-name">' + tech[1] + '</span>';
    card.addEventListener('click', function () { showToast(tech[0] + ' ' + tech[1] + ' — One of my tools!', '🛠️'); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
    skillsTechCol.appendChild(card);
  });


  // ===== BUILD TIMELINE =====

  var timeline = document.getElementById('timeline');

  journey.forEach(function (item) {
    var el = document.createElement('div');
    el.className = 'timeline-item reveal';
    el.innerHTML =
      '<div class="timeline-dot" style="background:' + item.color + '"></div>' +
      '<div class="timeline-card">' +
        '<span class="timeline-year" style="background:' + item.bg + ';color:' + item.color + '">' + item.year + '</span>' +
        '<h3 class="timeline-title">' + item.title + '</h3>' +
        '<p class="timeline-desc">' + item.desc + '</p>' +
      '</div>';
    timeline.appendChild(el);
  });


  // ===== TYPEWRITER =====

  var phrases = [
    'A Passionate Developer 💻',
    'An Indonesian Student 🇮🇩',
    'A Creative Thinker 🧠',
    'A Future Builder 🚀',
    'Fajriansyah Adithama ✨',
  ];
  var typeEl = document.getElementById('typewriter');
  var phraseIdx = 0, charIdx = 0, deleting = false, typeSpeed = 80;

  function typewrite() {
    var current = phrases[phraseIdx];
    if (deleting) {
      typeEl.textContent = current.substring(0, charIdx - 1);
      charIdx--;
      typeSpeed = 35;
    } else {
      typeEl.textContent = current.substring(0, charIdx + 1);
      charIdx++;
      typeSpeed = 75;
    }
    if (!deleting && charIdx === current.length) {
      typeSpeed = 2200;
      deleting = true;
    } else if (deleting && charIdx === 0) {
      deleting = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      typeSpeed = 400;
    }
    setTimeout(typewrite, typeSpeed);
  }
  setTimeout(typewrite, 1200);


  // ===== COUNTER ANIMATION =====

  function animateCounters() {
    document.querySelectorAll('.counter').forEach(function (counter) {
      if (counter.dataset.animated) return;
      var target = parseInt(counter.dataset.target, 10);
      if (isNaN(target)) return; // FIX #12: Guard NaN
      var cur = 0;
      var step = Math.max(1, Math.floor(target / 40));
      var interval = setInterval(function () {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(interval); }
        counter.textContent = cur + '+';
      }, 40);
      counter.dataset.animated = 'true';
    });
  }
  setTimeout(animateCounters, 1500);


  // ===== SCROLL REVEAL =====

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');

        // Skill bars
        entry.target.querySelectorAll('.skill-bar-fill').forEach(function (bar) {
          setTimeout(function () {
            var w = bar.dataset.width;
            if (w) bar.style.width = w + '%';
          }, 200);
        });

        // Skill percentages
        entry.target.querySelectorAll('.skill-pct').forEach(function (pct) {
          if (pct.dataset.animated) return;
          var val = parseInt(pct.dataset.value, 10);
          if (isNaN(val)) return; // FIX #12: Guard NaN
          var cur = 0;
          var interval = setInterval(function () {
            cur += 2;
            if (cur >= val) { cur = val; clearInterval(interval); }
            pct.textContent = cur + '%';
          }, 20);
          pct.dataset.animated = 'true';
        });
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });


  // ===== MOBILE MENU =====
  // FIX #6: Added overlay + outside click close

  var mobileMenu = document.getElementById('mobile-menu');
  var mobileOverlay = document.getElementById('mobile-overlay');

  function openMobile() {
    mobileMenu.classList.add('open');
    mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobile() {
    mobileMenu.classList.remove('open');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.getElementById('mobile-toggle').addEventListener('click', openMobile);
  document.getElementById('mobile-close').addEventListener('click', closeMobile);
  mobileOverlay.addEventListener('click', closeMobile);

  document.querySelectorAll('.mobile-link').forEach(function (link) {
    link.addEventListener('click', closeMobile);
  });


  // ===== NAV ACTIVE STATE =====
  // FIX #10: Include hero in active state logic

  var navSections = document.querySelectorAll('section[id]');

  function updateNav() {
    var current = '';
    navSections.forEach(function (s) {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    // If no section matched, we're at the hero
    if (!current) current = 'hero';

    document.querySelectorAll('.nav-link').forEach(function (link) {
      var href = link.getAttribute('href');
      link.classList.toggle('active', href === '#' + current);
    });
  }

  window.addEventListener('scroll', updateNav, { passive: true });


  // ===== SMOOTH SCROLL =====

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  // ===== CAMPUS MAIN CLICK =====

  var campusMainCard = document.getElementById('campus-main-card');
  if (campusMainCard) {
    campusMainCard.addEventListener('click', function () {
      showToast('Welcome to the Campus of Innovation, Indonesia!', '🏛️');
    });
  }


  // ===== CONTACT FORM =====
  // FIX #4: No more dynamic <style> injection — spin animation is in CSS

  var contactForm = document.getElementById('contact-form');
  var btnSubmit = document.getElementById('btn-submit');
  var btnSubmitText = btnSubmit ? btnSubmit.querySelector('.btn-submit-text') : null;
  var btnSubmitSVG = btnSubmit ? btnSubmit.querySelector('svg') : null;

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = document.getElementById('c-name').value.trim();
    var email = document.getElementById('c-email').value.trim();
    var subject = document.getElementById('c-subject').value.trim();
    var message = document.getElementById('c-message').value.trim();

    if (!name || !email || !subject || !message) {
      showToast('Please fill in all fields', '⚠️');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Please enter a valid email', '⚠️');
      return;
    }

    // Show loading state
    if (btnSubmit) {
      btnSubmit.disabled = true;
      if (btnSubmitSVG) btnSubmitSVG.classList.add('submit-spinner');
      if (btnSubmitText) btnSubmitText.textContent = 'Sending...';
    }

    setTimeout(function () {
      // Restore button
      if (btnSubmit) {
        btnSubmit.disabled = false;
        if (btnSubmitSVG) btnSubmitSVG.classList.remove('submit-spinner');
        if (btnSubmitText) btnSubmitText.textContent = 'Send Message';
      }
      contactForm.reset();
      showToast('Message sent successfully! I\'ll get back to you soon.', '✅');
    }, 1800);
  });


  // ===== PARALLAX ON HERO =====

  window.addEventListener('scroll', function () {
    var scrollY = window.scrollY;
    var hero = document.getElementById('hero');
    if (hero && scrollY < hero.offsetHeight) {
      var shapes = document.querySelectorAll('.geo-shape');
      shapes.forEach(function (shape, idx) {
        var speed = (idx + 1) * 0.03;
        var dir = idx % 2 === 0 ? 1 : -1;
        shape.style.transform = 'translateY(' + (scrollY * speed * dir) + 'px)';
      });
    }
  }, { passive: true });


  // ===== KEYBOARD ACCESSIBILITY =====

  document.querySelectorAll('.campus-main-card').forEach(function (el) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });


  // ===== RESIZE HANDLER =====
  // FIX #9: Recalculate smoothly instead of jumping to slide 0

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      // Rebuild dots for new slidesPerView
      buildDots();
      // Stay on current slide but clamp to new max
      goToSlide(Math.min(currentSlide, maxSlide));
    }, 250);
  });


  // ===== INITIAL STATE =====

  updateNav();

  // FIX #2: Ensure slider position is correct after layout paints
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      goToSlide(0);
    });
  });

})();