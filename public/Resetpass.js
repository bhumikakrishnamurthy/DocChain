document.getElementById('continue-btn').addEventListener('click', function () {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const messageBox = document.getElementById('message-box');
  
    if (!newPassword || !confirmPassword) {
      // Show error if either field is empty
      messageBox.textContent = 'Please enter a password.';
      messageBox.className = 'message-box error';
      messageBox.style.display = 'block';
  
      setTimeout(() => {
        messageBox.style.display = 'none';
      }, 5000);
    } else if (newPassword !== confirmPassword) {
      // Show error if passwords do not match
      messageBox.textContent = 'Passwords do not match!';
      messageBox.className = 'message-box error';
      messageBox.style.display = 'block';
  
      setTimeout(() => {
        messageBox.style.display = 'none';
      }, 5000);
    } else {
      // Show success if passwords match
      messageBox.textContent = 'Password changed successfully!';
      messageBox.className = 'message-box success';
      messageBox.style.display = 'block';
  
      setTimeout(() => {
        window.location.href = './Login.html'; // Redirect to the login page
      }, 3000);
    }
  });
  