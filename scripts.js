document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const correctPassword = 'yourpassword';  // Replace 'yourpassword' with the actual password

    const message = document.getElementById('message');

    if (password === correctPassword) {
        message.style.color = 'green';
        message.textContent = 'Login successful!';
    } else {
        message.style.color = 'red';
        message.textContent = 'Incorrect password.';
    }
});
