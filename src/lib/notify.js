import { toast } from "@/components/ui/use-toast";

export function notifySuccess(title, description) {
  toast({ title, description, variant: "default" });
}

export function notifyError(title, description) {
  toast({ title, description, variant: "destructive" });
}

export function notifySaved(what) {
  toast({ title: `${what} saved`, variant: "default" });
}

export function playAlertChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // blocked or unavailable in background/uninteracted window
  }
}