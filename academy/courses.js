document.addEventListener('DOMContentLoaded', async () => {
    
    // Check login status
    try {
        const res = await fetch('/api/student/status?t=' + Date.now());
        const data = await res.json();
        
        if (!data.logged_in) {
            window.location.href = '/academy/';
            return;
        }
        
        // Update UI with student name
        document.getElementById('student-name').textContent = data.name || data.email;
        
        // Update buttons based on purchased courses
        const purchasedCourses = data.courses || [];
        
        ['calisthenics', 'robotics'].forEach(courseId => {
            const btn = document.getElementById(`btn-${courseId}`);
            if (btn) {
                if (purchasedCourses.includes(courseId)) {
                    btn.textContent = 'Enter Course →';
                    btn.className = 'btn-enter';
                    btn.onclick = () => {
                        window.location.href = `/academy/course/${courseId}`;
                    };
                } else {
                    btn.textContent = 'Buy Now';
                    btn.className = 'btn-buy';
                    btn.onclick = () => handleCheckout(courseId, btn);
                }
            }
        });
        
    } catch (e) {
        console.error('Error checking status', e);
        window.location.href = '/academy/';
    }
    
    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await fetch('/api/student/logout', { method: 'POST' });
            window.location.href = '/academy/';
        } catch (e) {
            console.error(e);
        }
    });
    
    // Check for success parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
        const toast = document.getElementById('toast');
        const course = urlParams.get('course') || 'the course';
        toast.textContent = `Payment successful! You now have access to ${course}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            // Clean up URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 5000);
    }
});

async function handleCheckout(courseId, btnElement) {
    const originalText = btnElement.textContent;
    btnElement.textContent = 'Loading...';
    btnElement.disabled = true;
    
    try {
        const res = await fetch('/api/student/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course_id: courseId })
        });
        
        const data = await res.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            alert(data.error || 'Checkout failed');
            btnElement.textContent = originalText;
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred during checkout');
        btnElement.textContent = originalText;
        btnElement.disabled = false;
    }
}
