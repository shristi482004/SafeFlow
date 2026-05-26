// SafeFlow Authentication Manager

/**
 * Parses JWT token payload from base64 encoding without external dependencies.
 */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem('sf_token', token);
  localStorage.setItem('sf_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('sf_token');
  localStorage.removeItem('sf_user');
}

export function getSessionToken() {
  return localStorage.getItem('sf_token');
}

export function getSessionUser() {
  const user = localStorage.getItem('sf_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
}

export function getSessionRole() {
  const user = getSessionUser();
  return user ? user.role : null;
}

export function isLoggedIn() {
  const token = getSessionToken();
  if (!token) return false;
  
  // Verify token expiry if stored
  const payload = parseJwt(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    clearSession();
    return false;
  }
  return true;
}

export async function loginUser(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Login failed.');
  }

  saveSession(data.token, data.user);
  return data;
}

export async function registerUser(email, password, name, role) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Registration failed.');
  }

  saveSession(data.token, data.user);
  return data;
}

// Global scope export for inline onclick handlers in app.html
window.demoLogin = async function(email, password) {
  try {
    const data = await loginUser(email, password);
    window.showToast('Login Successful', `Welcome back, ${data.user.name}!`, 'toast-success');
    window.initializeDashboard();
  } catch (e) {
    window.showToast('Login Failed', e.message, 'toast-danger');
  }
};

window.logOutUser = function() {
  clearSession();
  localStorage.removeItem('sf_theme');
  document.body.classList.remove('theme-light');
  window.showToast('Logged Out', 'Successfully signed out.', 'toast-success');
  window.showAuthView();
};

