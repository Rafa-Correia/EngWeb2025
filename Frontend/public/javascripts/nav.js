// Helper function to get a cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Called when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  const navButtons = document.getElementById('nav-buttons');
  const userLoggedIn = getCookie('jwt');
  const diaryButton = document.getElementById('diary-route-button')

  if (userLoggedIn) {
    navButtons.innerHTML = `
      <button onclick="logout()" class="w3-button w3-red w3-margin-right w3-round-large">Logout</button>
    `;
    if(diaryButton)
      diaryButton.disabled = false
  } else {
    navButtons.innerHTML = `
      <button onclick="window.location.href='/users/register'" class="w3-button w3-blue w3-margin-right w3-round-large">Register</button>
      <button onclick="window.location.href='/users/login'" class="w3-button w3-green w3-round-large">Login</button>
    `;
    if(diaryButton)
      diaryButton.disabled = true
  }

});

// Logout function to remove cookie and refresh/redirect
function logout() {
  fetch('/users/logout', {
    method: 'POST',
    credentials: 'include'
  })
  .then(ans => {
    if(ans.ok) {
        window.location.href = '/'; // Redirect to login page after logout
    } 
    else {
        alert("Couldn't logout.")
    }
  })
  .catch(err => {
    console.log(`Failed to logout: ${err}`)
  })
}