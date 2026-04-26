import "server-only";
import { sendEmail } from "./resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://1968.love";
const SUPPORT = "support@1968.love";

// =======================================
// ベータ応募、応募者本人への受付メール
// =======================================
export async function sendBetaApplicationReceipt(args: {
  to: string;
  name: string;
}) {
  return sendEmail({
    to: args.to,
    subject: "[1968] ベータテスター応募を受け付けました",
    text: [
      `${args.name} 様`,
      "",
      "1968 ベータテスター募集にご応募いただきありがとうございます。",
      "",
      "内容を確認のうえ、3〜5 営業日を目処に、",
      "ご登録のメールアドレスへご連絡いたします。",
      "今しばらくお待ちください。",
      "",
      "1968 についての詳細は以下をご覧ください。",
      `${SITE_URL}`,
      "",
      "ご質問は本メールにご返信、または",
      `${SUPPORT} までご連絡ください。`,
      "",
      "—",
      "1968 運営、油谷和好",
    ].join("\n"),
  });
}

// =======================================
// ベータ応募、運営への通知メール
// =======================================
export async function sendBetaApplicationAdminNotice(args: {
  name: string;
  email: string;
  motivation: string;
}) {
  const to = process.env.BETA_NOTIFY_EMAIL ?? SUPPORT;
  return sendEmail({
    to,
    subject: `[1968] 新しいベータテスター応募、${args.name} さん`,
    text: [
      "ベータテスター応募が届きました。",
      "",
      `お名前、${args.name}`,
      `メール、${args.email}`,
      "",
      "応募動機、",
      args.motivation,
      "",
      "管理画面、",
      `${SITE_URL}/admin/applications`,
    ].join("\n"),
  });
}

// =======================================
// ベータ採用、招待メール
// =======================================
export async function sendBetaInvitation(args: { to: string; name: string }) {
  return sendEmail({
    to: args.to,
    subject: "[1968] ベータテスター採用のご案内",
    text: [
      `${args.name} 様`,
      "",
      "1968 ベータテスターにご採用となりました。",
      "おめでとうございます、ご参加を心よりお待ちしておりました。",
      "",
      "以下の URL から、会員登録のお手続きをお願いします。",
      `${SITE_URL}/register`,
      "",
      "ご登録後、運営側でベータ特典（正会員プラン 1 年無料）を",
      "付与しますので、しばらくお待ちください。",
      "",
      "ご不明な点は本メールにご返信、または",
      `${SUPPORT} までお気軽にお問い合わせください。`,
      "",
      "—",
      "1968 運営、油谷和好",
    ].join("\n"),
  });
}

// =======================================
// 身分証審査結果、承認
// =======================================
export async function sendVerificationApproved(args: {
  to: string;
  nickname: string;
}) {
  return sendEmail({
    to: args.to,
    subject: "[1968] 本人確認が完了しました",
    text: [
      `${args.nickname} 様`,
      "",
      "ご提出いただいた身分証の確認が完了しました。",
      "「本人確認済」のバッジがマイページに表示されます。",
      "",
      `マイページ、${SITE_URL}/mypage`,
      "",
      "今後とも 1968 をよろしくお願いいたします。",
      "",
      "—",
      "1968 運営、油谷和好",
    ].join("\n"),
  });
}

// =======================================
// 身分証審査結果、却下
// =======================================
export async function sendVerificationRejected(args: {
  to: string;
  nickname: string;
  reason: string;
}) {
  return sendEmail({
    to: args.to,
    subject: "[1968] 本人確認のご案内（再提出のお願い）",
    text: [
      `${args.nickname} 様`,
      "",
      "ご提出いただいた身分証について、以下の理由により、",
      "今回はお預かりすることができませんでした。",
      "",
      `理由、${args.reason}`,
      "",
      "お手数ですが、以下の URL から再度ご提出いただけますと",
      "幸いです。",
      `${SITE_URL}/mypage/verification`,
      "",
      "ご不明な点は本メールにご返信、または",
      `${SUPPORT} までご連絡ください。`,
      "",
      "—",
      "1968 運営、油谷和好",
    ].join("\n"),
  });
}
