"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { PREFECTURES } from "@/lib/prefectures";
import { createProfile } from "@/app/onboarding/actions";

// LINE 風の会話形式オンボーディング。
// 運営ちゃん（68）が一問ずつ尋ね、ユーザーが選択／入力で答える。
// 完了時に Server Action で profiles を作成して /mypage へ遷移。

type StepKey =
  | "greet"
  | "birthMonth"
  | "birthDay"
  | "nickname"
  | "gender"
  | "prefecture"
  | "introduction"
  | "bioVisible"
  | "submit"
  | "done";

type Bubble =
  | { side: "bot"; text: string; key: string }
  | { side: "user"; text: string; key: string };

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
  { value: "prefer_not_to_say", label: "答えない" },
];

const BIO_OPTIONS = [
  { value: "members_only", label: "会員のみ（推奨）" },
  { value: "public", label: "誰でも閲覧可" },
  { value: "private", label: "自分だけ" },
];

export function ChatOnboarding({ email }: { email: string }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([
    {
      side: "bot",
      key: "greet1",
      text: "こんにちは、運営ちゃん（68）です。1968 へようこそ☕",
    },
    {
      side: "bot",
      key: "greet2",
      text: "ここは同い年だけが集まる、ほっと一息つける場所です。",
    },
    {
      side: "bot",
      key: "greet3",
      text: "プロフィールを少しずつ伺いますね。3 分ほどで終わります、お気軽にどうぞ。",
    },
  ]);
  const [step, setStep] = useState<StepKey>("birthMonth");
  const [data, setData] = useState({
    birth_month: "",
    birth_day: "",
    nickname: "",
    gender: "",
    prefecture: "",
    introduction: "",
    bio_visible: "members_only",
  });
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新しいバブルが追加されたら最下部までスクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [bubbles]);

  function pushBot(text: string) {
    setBubbles((b) => [
      ...b,
      { side: "bot", key: `bot-${b.length}`, text },
    ]);
  }
  function pushUser(text: string) {
    setBubbles((b) => [
      ...b,
      { side: "user", key: `user-${b.length}`, text },
    ]);
  }

  // 各ステップでユーザーが回答すると次の質問を投げる
  function answerBirthMonth(m: number) {
    setData((d) => ({ ...d, birth_month: String(m) }));
    pushUser(`${m} 月`);
    setTimeout(() => {
      pushBot(`ありがとうございます。何日生まれですか？`);
      setStep("birthDay");
    }, 300);
  }

  function answerBirthDay(d: number) {
    setData((prev) => ({ ...prev, birth_day: String(d) }));
    pushUser(`${d} 日`);
    setTimeout(() => {
      pushBot("ありがとうございます💝 1968 年 1 月 1 日〜12 月 31 日のお生まれの方限定のコミュニティです。");
      pushBot("次に、ここで使うニックネームを教えてください。本名でなくて大丈夫ですよ（例、ゆきちゃん、ふじの風）");
      setStep("nickname");
    }, 400);
  }

  function answerNickname() {
    if (!data.nickname.trim()) return;
    pushUser(data.nickname);
    setTimeout(() => {
      pushBot(`「${data.nickname}」さん、いいお名前ですね😊`);
      pushBot("性別を教えていただけますか？答えたくない方も大丈夫です。");
      setStep("gender");
    }, 300);
  }

  function answerGender(value: string, label: string) {
    setData((d) => ({ ...d, gender: value }));
    pushUser(label);
    setTimeout(() => {
      pushBot("ありがとうございます。");
      pushBot("お住まいの都道府県を教えていただけますか？オフ会や地元トピックで便利です（任意）");
      setStep("prefecture");
    }, 300);
  }

  function answerPrefecture(p: string) {
    setData((d) => ({ ...d, prefecture: p }));
    pushUser(p || "選択しない");
    setTimeout(() => {
      pushBot("ありがとうございます。");
      pushBot("最後に、簡単な自己紹介を一言いただけますか？「同い年の方とお話したいです」だけでも大歓迎です（200字以内、任意）");
      setStep("introduction");
    }, 300);
  }

  function answerIntroduction(skip = false) {
    if (skip) {
      pushUser("あとで書きます");
    } else if (data.introduction.trim()) {
      pushUser(data.introduction);
    } else {
      pushUser("あとで書きます");
    }
    setTimeout(() => {
      pushBot("ありがとうございます💛");
      pushBot("プロフィールの公開範囲を選んでください。あとで変更できます。");
      setStep("bioVisible");
    }, 300);
  }

  function answerBioVisible(value: string, label: string) {
    setData((d) => ({ ...d, bio_visible: value }));
    pushUser(label);
    setTimeout(() => {
      pushBot("ご回答ありがとうございました🙏");
      pushBot("登録を完了しますね、少々お待ちください…");
      setStep("submit");
      submitProfile({ ...data, bio_visible: value });
    }, 300);
  }

  function submitProfile(payload: typeof data) {
    setSubmitError(null);
    const fd = new FormData();
    fd.set("nickname", payload.nickname);
    fd.set("birth_month", payload.birth_month);
    fd.set("birth_day", payload.birth_day);
    fd.set("gender", payload.gender);
    fd.set("prefecture", payload.prefecture);
    fd.set("introduction", payload.introduction);
    fd.set("bio_visible", payload.bio_visible);
    startTransition(async () => {
      try {
        await createProfile(fd);
      } catch (e) {
        // redirect が throw されるのは正常系（Server Action からの遷移）
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes("NEXT_REDIRECT") ||
          msg.includes("NEXT_NOT_FOUND")
        ) {
          // ok
          return;
        }
        setSubmitError("登録に失敗しました、ページをリロードしてやり直してください");
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl px-0 sm:px-4 py-4 sm:py-8">
      {/* ヘッダー */}
      <div className="px-4 sm:px-0 mb-3">
        <h1 className="text-xl font-bold">プロフィール作成</h1>
        <p className="mt-0.5 text-xs text-foreground/60">
          登録メール、{email}
        </p>
      </div>

      {/* 会話エリア */}
      <div
        ref={scrollRef}
        className="bg-muted/20 sm:rounded-xl border-y sm:border border-border p-4 max-h-[60dvh] overflow-y-auto"
      >
        <ul className="space-y-3">
          {bubbles.map((b) => (
            <li
              key={b.key}
              className={`flex ${b.side === "user" ? "justify-end" : "justify-start"}`}
            >
              {b.side === "bot" && (
                <span
                  aria-hidden
                  className="shrink-0 size-9 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-base mr-2"
                  title="運営ちゃん（68）"
                >
                  💁‍♀️
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-7 whitespace-pre-wrap ${
                  b.side === "user"
                    ? "bg-primary text-white rounded-br-sm"
                    : "bg-background border border-border rounded-bl-sm"
                }`}
              >
                {b.text}
              </div>
            </li>
          ))}
        </ul>

        {submitError && (
          <p className="mt-3 text-sm text-red-700 text-center">{submitError}</p>
        )}
      </div>

      {/* 入力エリア、ステップ別 */}
      <div className="px-4 sm:px-0 mt-4">
        {step === "birthMonth" && (
          <div>
            <p className="text-sm font-medium mb-2">何月生まれですか？</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => answerBirthMonth(m)}
                  className="min-h-[var(--spacing-tap)] px-3 rounded-full border border-border bg-background hover:bg-primary hover:text-white text-sm font-medium"
                >
                  {m}月
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "birthDay" && (
          <div>
            <p className="text-sm font-medium mb-2">何日生まれですか？</p>
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => answerBirthDay(d)}
                  className="min-h-[40px] rounded-full border border-border bg-background hover:bg-primary hover:text-white text-sm"
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "nickname" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              answerNickname();
            }}
          >
            <input
              type="text"
              value={data.nickname}
              onChange={(e) =>
                setData((d) => ({ ...d, nickname: e.target.value }))
              }
              maxLength={30}
              placeholder="例、あぶ、ゆきちゃん、富士の風"
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
              autoFocus
            />
            <button
              type="submit"
              disabled={!data.nickname.trim()}
              className="mt-3 w-full min-h-[var(--spacing-tap)] rounded-full bg-primary text-white font-medium disabled:opacity-50"
            >
              この名前で進む
            </button>
          </form>
        )}

        {step === "gender" && (
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => answerGender(g.value, g.label)}
                className="min-h-[var(--spacing-tap)] px-4 rounded-full border border-border bg-background hover:bg-primary hover:text-white text-sm font-medium"
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {step === "prefecture" && (
          <div>
            <select
              value={data.prefecture}
              onChange={(e) =>
                setData((d) => ({ ...d, prefecture: e.target.value }))
              }
              className="w-full min-h-[var(--spacing-tap)] px-3 rounded border border-border bg-background"
            >
              <option value="">選択しない</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => answerPrefecture(data.prefecture)}
              className="mt-3 w-full min-h-[var(--spacing-tap)] rounded-full bg-primary text-white font-medium"
            >
              この都道府県で進む
            </button>
          </div>
        )}

        {step === "introduction" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              answerIntroduction(false);
            }}
          >
            <textarea
              value={data.introduction}
              onChange={(e) =>
                setData((d) => ({ ...d, introduction: e.target.value }))
              }
              maxLength={200}
              rows={3}
              placeholder="例、同い年の方とのんびり昔話をしたいです"
              className="w-full px-3 py-2 rounded border border-border bg-background"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="flex-1 min-h-[var(--spacing-tap)] rounded-full bg-primary text-white font-medium"
              >
                {data.introduction.trim() ? "送信する" : "あとで書く"}
              </button>
              {data.introduction.trim() && (
                <button
                  type="button"
                  onClick={() => answerIntroduction(true)}
                  className="min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm"
                >
                  あとで
                </button>
              )}
            </div>
          </form>
        )}

        {step === "bioVisible" && (
          <div className="space-y-2">
            {BIO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => answerBioVisible(opt.value, opt.label)}
                className="block w-full min-h-[var(--spacing-tap)] px-4 rounded-full border border-border bg-background hover:bg-primary hover:text-white text-sm font-medium"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {step === "submit" && (
          <div className="text-center text-sm text-foreground/60">
            {pending ? "登録中..." : "完了しました、まもなくマイページへ移動します"}
          </div>
        )}
      </div>
    </div>
  );
}
