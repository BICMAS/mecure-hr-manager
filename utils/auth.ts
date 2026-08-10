const ACCESS_TOKEN_KEY = 'mecure_access_token';
const REFRESH_TOKEN_KEY = 'mecure_refresh_token';

export function saveAuth(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export const getCurrentUserName = () => {
  try {
    const raw = localStorage.getItem("user");
    if(!raw) return "HR Admin";
    const user = JSON.parse(raw);
    return user.fullName || user.name || "HR Admin";
  } catch {
    return "HR Admin";
  }
}
