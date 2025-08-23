// Clear all authentication data
console.log('🧹 Clearing all authentication data...');

// Clear localStorage
localStorage.removeItem('token');
localStorage.removeItem('user');

// Clear sessionStorage if any
sessionStorage.clear();

// Clear any cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Authentication data cleared successfully!');
console.log('🔄 Refreshing page...');

// Refresh the page
setTimeout(() => {
  window.location.reload();
}, 1000);
