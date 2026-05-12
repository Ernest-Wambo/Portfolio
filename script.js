/**
 * Client-Side Application Logic for Ernest Wambo's Portfolio
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navigation Header Scroll Effect
  const header = document.getElementById('navbar');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // 2. Mobile Menu Toggler
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      // Update toggle icon
      const icon = mobileToggle.querySelector('i');
      if (navMenu.classList.contains('open')) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      } else {
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
      }
    });

    // Close menu when clicking a link
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const icon = mobileToggle.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      });
    });
  }

  // 3. Dynamic Projects Category Filtering
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');

      projectCards.forEach(card => {
        const category = card.getAttribute('data-category');
        
        if (filterValue === 'all' || filterValue === category) {
          card.style.display = 'flex';
          // Trigger subtle layout reflow animation
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 300);
        }
      });
    });
  });

  // 4. Contact Form AJAX Handler (Formspree Integration)
  const contactForm = document.getElementById('contact-form');
  const formAlert = document.getElementById('form-alert');

  if (contactForm && formAlert) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Update UI state during submission
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Dispatching Payload... <i class="fa-solid fa-spinner fa-spin"></i>';
      submitBtn.disabled = true;

      try {
        const response = await fetch(contactForm.action, {
          method: contactForm.method,
          body: new FormData(contactForm),
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          formAlert.className = 'form-status success';
          formAlert.innerHTML = '<i class="fa-solid fa-circle-check"></i> Payload dispatched successfully! I will read your message and respond shortly.';
          contactForm.reset();
        } else {
          const data = await response.json();
          formAlert.className = 'form-status error';
          if (Object.hasOwn(data, 'errors')) {
            formAlert.innerHTML = data.errors.map(err => err.message).join(', ');
          } else {
            formAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error encountered while dispatching payload. Please retry.';
          }
        }
      } catch (error) {
        formAlert.className = 'form-status error';
        formAlert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Network anomaly detected. Could not connect to the email dispatch server.';
      } finally {
        // Restore UI button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        
        // Auto-hide success alert after 8 seconds
        setTimeout(() => {
          if (formAlert.classList.contains('success')) {
            formAlert.style.display = 'none';
            formAlert.className = 'form-status';
          }
        }, 8000);
      }
    });
  }

  // 5. Custom Hook for Download CV Action
  const downloadCvBtn = document.getElementById('download-cv-btn');
  if (downloadCvBtn) {
    downloadCvBtn.addEventListener('click', (e) => {
      // Verify if target URL points to valid doc, else show native success simulation dialog
      const targetHref = downloadCvBtn.getAttribute('href');
      if (targetHref === '#cv') {
        e.preventDefault();
        alert("✨ CV/Resume file setup complete! Place your final 'resume.pdf' binary file in the workspace directory to enable instant download tracking.");
      }
    });
  }

  // 6. Dynamic Animation Trails for Walking Pet
  const petCharacter = document.getElementById('animated-bottom-pet');
  const petWrapper = document.querySelector('.pet-wrapper');
  
  if (petCharacter && petWrapper) {
    // Optionally spawn ambient paw trails periodically
    setInterval(() => {
      // Get current character computed position relative to base
      const rect = petCharacter.getBoundingClientRect();
      if (rect.left > 0 && rect.left < window.innerWidth) {
        const paw = document.createElement('div');
        paw.className = 'paw-trail';
        // Place trail exactly behind pet movement direction
        paw.style.left = `${rect.left + 25}px`;
        paw.style.bottom = '8px';
        petWrapper.appendChild(paw);
        
        // Purge trail element post keyframe completion
        setTimeout(() => paw.remove(), 2000);
      }
    }, 1200);
  }
});
