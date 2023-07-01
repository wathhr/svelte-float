export function generateID(length = 8) {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join('');
}
