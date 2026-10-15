document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is logged in, nothing to do
        } else {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        }
    });

    document.getElementById('logoutButton').addEventListener('click', function() {
        firebase.auth().signOut().then(() => {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
        });
    });

    document.getElementById('resetPasswordForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const user = firebase.auth().currentUser;

        user.updatePassword(newPassword).then(() => {
            console.log('Password updated successfully');
            alert('Password updated successfully');
        }).catch((error) => {
            console.error('Error updating password:', error);
            alert('Error updating password. Please try again.');
        });
    });
});
