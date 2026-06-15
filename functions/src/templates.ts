import { renderHtml, type Mail } from "./email";

const STEPS = [
  "Open the link below in Safari (on iPhone).",
  "Tap the ••• (three dots) at the bottom right.",
  "Tap Share.",
  "Scroll down the list and tap “Add to Home Screen”.",
  "In the popup, tap Add.",
  "It's now on your home screen — open it and sign in with this Google account.",
];

const HOW_TO = `Add it to your home screen so it feels like a real app:\n${STEPS.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`;

const stepsHtml = `<ol style="color:#a8a193;font-size:14px;padding-left:18px;margin:8px 0 0">${STEPS.map(
  (s) => `<li style="margin-bottom:4px">${s}</li>`,
).join("")}</ol>`;

export function inviteEmail(to: string, appUrl: string, firstName?: string): Mail {
  const greeting = firstName ? `${firstName}, a hunter is needed` : "A hunter is needed";
  return {
    to,
    subject: "You're invited to the hunt — Catacombs & Starspawns",
    text: `${greeting}.\n\nYou've been added to our Catacombs & Starspawns party. Open the app and sign in with this Google account to forge your hunter, see when we play, and read the handbook.\n\n${appUrl}\n\n${HOW_TO}\n\nSee you in the fog.`,
    html: renderHtml({
      heading: greeting,
      bodyHtml: `<p>You've been added to our <strong>Catacombs &amp; Starspawns</strong> party.</p>
        <p>Sign in with <em>this</em> Google account to forge your hunter, see when we next play, and read the handbook.</p>
        <p style="color:#e9e3d5;font-size:14px;margin-top:14px"><strong>Add it to your home screen so it feels like a real app:</strong></p>
        ${stepsHtml}`,
      ctaText: "Enter the app",
      ctaHref: appUrl,
    }),
  };
}

export function characterReminder(to: string, appUrl: string): Mail {
  return {
    to,
    subject: "Forge your hunter before the next session",
    text: `Your hunter card isn't ready yet.\n\nOpen the app and build your character before our next session — it only takes a few minutes, and the maths is done for you.\n\n${appUrl}`,
    html: renderHtml({
      heading: "Forge your hunter",
      bodyHtml: `<p>Your hunter card isn't ready yet.</p>
        <p>Open the app and build your character before our next session — it only takes a few minutes, and the maths is done for you.</p>`,
      ctaText: "Build my hunter",
      ctaHref: `${appUrl}/hunter`,
    }),
  };
}

export function rsvpReminder(
  to: string,
  appUrl: string,
  sessionTitle: string,
  whenLabel: string,
): Mail {
  return {
    to,
    subject: `Are you coming to ${sessionTitle}?`,
    text: `We haven't heard from you about the next session.\n\n${sessionTitle}\n${whenLabel}\n\nOpen the app and let us know if you can make it.\n\n${appUrl}`,
    html: renderHtml({
      heading: "Will you answer the call?",
      bodyHtml: `<p>We haven't heard from you about the next session:</p>
        <p style="font-size:18px;color:#e9e3d5"><strong>${sessionTitle}</strong><br>
        <span style="color:#c9a45a">${whenLabel}</span></p>
        <p>Open the app and let us know if you can make it.</p>`,
      ctaText: "RSVP now",
      ctaHref: appUrl,
    }),
  };
}
