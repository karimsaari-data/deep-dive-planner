import confetti from "canvas-confetti";

/**
 * Déclenche une animation de confettis festive (style "action terminée").
 * Plusieurs salves successives donnent un effet de feu d'artifice agréable.
 * Respecte la préférence "réduire les animations" du système.
 */
export const celebrate = () => {
  // Ne rien lancer si l'utilisateur préfère réduire les animations
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const duration = 1500;
  const end = Date.now() + duration;

  // Salves latérales continues (effet "pluie" depuis les deux bords)
  const frame = () => {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      startVelocity: 45,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      startVelocity: 45,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  // Grosse salve initiale au centre
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.6 },
  });

  frame();
};
