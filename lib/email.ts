import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "placeholder");
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendInviteEmail(
  to: string,
  inviteToken: string,
  tenantName: string,
  role: string
) {
  const link = `${APP_URL}/api/invites/accept?token=${inviteToken}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: `You've been invited to ${tenantName}'s analytics dashboard`,
    html: `
      <p>You have been invited to join <strong>${tenantName}</strong>'s dashboard as <strong>${role.replace("client_", "")}</strong>.</p>
      <p><a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
}

export async function sendSyncErrorAlert(
  agentEmail: string,
  clientName: string,
  error: string
) {
  await getResend().emails.send({
    from: FROM,
    to: agentEmail,
    subject: `⚠️ Sync failed for ${clientName}`,
    html: `
      <p>The data sync for <strong>${clientName}</strong> failed with the following error:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:4px;">${error}</pre>
      <p><a href="${APP_URL}/admin">Open Admin Panel</a> to reconnect or re-map the sheet.</p>
    `,
  });
}
