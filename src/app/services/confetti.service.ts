import { Injectable } from "@angular/core";
import confetti, { Options } from "@fewell/canvas-confetti-ts";

@Injectable({
  providedIn: "root",
})
export class ConfettiService {
  celebrate() {
    const duration = 3000; // in milliseconds

    // Fire multiple bursts with different configurations
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }, // Start above center
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 120,
        origin: { y: 0.7 }, // Start from higher
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.8 }, // Start from even higher
      });
    }, 500);

    // Clear confetti after duration
    setTimeout(() => confetti.reset(), duration);
  }

  celebrateFromSides() {
    const duration = 3000; // in milliseconds

    // Fire from left edge
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
    });

    // Fire from right edge
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
    });

    // Clear confetti after duration
    setTimeout(() => confetti.reset(), duration);
  }

  celebrateFromPoint(x: number, y: number) {
    const duration = 3000; // in milliseconds

    // Convert screen coordinates to relative coordinates (0-1)
    const origin = {
      x: Math.min(Math.max(0.1, x / window.innerWidth), 0.9), // Clamp between 0.1 and 0.9
      y: Math.min(Math.max(0.1, y / window.innerHeight), 0.9), // Clamp between 0.1 and 0.9
    };

    confetti({
      particleCount: 50,
      spread: 70,
      origin,
      startVelocity: 30,
    });

    // Clear confetti after duration
    setTimeout(() => confetti.reset(), duration);
  }
}
