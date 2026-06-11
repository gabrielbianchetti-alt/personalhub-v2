// Feedback háptico prometido pelo §4.1/§6.4. iOS ignora em silêncio.
export function vibra(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // sem suporte — segue o jogo
  }
}
