const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateSpaceId() {
  let result = '';
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    result += alphabet[idx];
  }
  return result;
}

export function loadSpaceId() {
  return localStorage.getItem('peaceful.spaceId') || '';
}

export function saveSpaceId(id) {
  localStorage.setItem('peaceful.spaceId', id);
}

export function clearSpaceId() {
  localStorage.removeItem('peaceful.spaceId');
}
