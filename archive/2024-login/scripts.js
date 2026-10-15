document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const correctPasswordHash = 'YOUR_HASHED_PASSWORD';  // Replace with the hashed password

    const shaObj = new jsSHA("SHA-256", "TEXT");
    shaObj.update(password);
    const hash = shaObj.getHash("HEX");

    const message = document.getElementById('message');

    if (hash === correctPasswordHash) {
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'recipe.html';
    } else {
        message.style.color = 'red';
        message.textContent = 'Incorrect password.';
    }
});
