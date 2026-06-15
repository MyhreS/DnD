import { renderHtml, type Mail } from "./email";

const HOW_TO =
  "Open the link and sign in with this Google account. On iPhone, tap Share → Add to Home Screen to install it as an app.";

export function inviteEmail(to: string, appUrl: string): Mail {
  return {
    to,
    subject: "You're invited to the hunt — Catacombs & Starspawns",
    text: `A hunter is needed.\n\nYou've been added to our Catacombs & Starspawns party. Open the app and sign in with this Google account to forge your hunter, see when we play, and read the handbook.\n\n${appUrl}\n\n${HOW_TO}\n\nSee you in the fog.`,
    html: renderHtml({
      heading: "A hunter is needed",
      bodyHtml: `<p>You've been added to our <strong>Catacombs &amp; Starspawns</strong> party.</p>
        <p>Sign in with <em>this</em> Google account to forge your hunter, see when we next play, and read the handbook.</p>
        <p style="color:#a8a193;font-size:14px">${HOW_TO}</p>`,
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
