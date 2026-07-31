document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const formSlider = document.querySelector('.form-slider');
    const tabIndicator = document.querySelector('.tab-indicator');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const togglePasswords = document.querySelectorAll('.toggle-password');
    const msgContainer = document.getElementById('message-container');
    
    const signupPassword = document.getElementById('signup-password');
    const strengthContainer = document.querySelector('.password-strength');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');

    // Tab Switching
    tabBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            // Update active states
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Move indicator
            tabIndicator.style.transform = `translateX(${index * 100}%)`;

            // Slide forms
            formSlider.style.transform = `translateX(-${index * 50}%)`;

            // Clear messages
            hideMessage();
        });
    });

    // Toggle Password Visibility
    togglePasswords.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            const svg = btn.querySelector('svg');
            if (type === 'text') {
                svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
            } else {
                svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
            }
        });
    });

    // Password Strength Meter
    if (signupPassword) {
        signupPassword.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length > 0) {
                strengthContainer.classList.add('visible');
                
                let strength = 0;
                if (val.length >= 6) strength += 1;
                if (val.match(/[a-z]/) && val.match(/[A-Z]/)) strength += 1;
                if (val.match(/[0-9]/)) strength += 1;
                if (val.match(/[^a-zA-Z0-9]/)) strength += 1;

                if (val.length < 6) {
                    strengthFill.style.width = '20%';
                    strengthFill.style.backgroundColor = 'var(--error)';
                    strengthText.textContent = 'Weak';
                    strengthText.style.color = 'var(--error)';
                } else if (strength < 3) {
                    strengthFill.style.width = '60%';
                    strengthFill.style.backgroundColor = '#eab308'; // Yellow
                    strengthText.textContent = 'Medium';
                    strengthText.style.color = '#eab308';
                } else {
                    strengthFill.style.width = '100%';
                    strengthFill.style.backgroundColor = 'var(--success)';
                    strengthText.textContent = 'Strong';
                    strengthText.style.color = 'var(--success)';
                }
            } else {
                strengthContainer.classList.remove('visible');
            }
        });
    }

    // Form Submission Handlers
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const btn = loginForm.querySelector('.submit-btn');
        
        await handleAuth(btn, '/api/student/login', { email, password }, () => {
            window.location.href = '/academy/courses';
        });
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        const btn = signupForm.querySelector('.submit-btn');

        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirm) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        await handleAuth(btn, '/api/student/signup', { name, email, password }, () => {
            window.location.href = '/academy/courses';
        });
    });

    // Helpers
    async function handleAuth(btn, url, data, onSuccess) {
        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        
        // Loading state
        btn.disabled = true;
        btnText.style.opacity = '0';
        spinner.classList.remove('hidden');
        hideMessage();

        try {
            // Mock API Call - replace with real fetch if available
            // const res = await fetch(url, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(data)
            // });
            
            // Simulate network delay
            await new Promise(r => setTimeout(r, 1000));
            
            showMessage('Success! Redirecting...', 'success');
            setTimeout(onSuccess, 1000);
            
        } catch (error) {
            showMessage(error.message || 'An error occurred. Please try again.', 'error');
            // Reset button state
            btn.disabled = false;
            btnText.style.opacity = '1';
            spinner.classList.add('hidden');
        }
    }

    function showMessage(msg, type) {
        msgContainer.textContent = msg;
        msgContainer.className = `message ${type}`;
        
        // Retrigger animation
        if (type === 'error') {
            msgContainer.style.animation = 'none';
            msgContainer.offsetHeight; /* trigger reflow */
            msgContainer.style.animation = null; 
        }
    }

    function hideMessage() {
        msgContainer.className = 'message hidden';
    }
});
