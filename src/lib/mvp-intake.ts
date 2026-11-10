// Keep the existing full registration journey testable against its disposable database.
const isolatedJourney = process.env.CANG_TEST_OPEN_INTAKE === "1"
  && /^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(process.env.APP_URL ?? "")
  && /\/_?[^/?#]*_test(?:\?|$)/.test(process.env.DATABASE_URL ?? "");
export const intakePaused = !isolatedJourney;

export const intakeNotice = {
  en: "This site is an MVP in development. We are currently not accepting new applications.",
  vi: "Trang web đang trong giai đoạn phát triển MVP. Chúng tôi tạm ngừng tiếp nhận yêu cầu mới.",
};

export function pausedApplication() {
  return { ok: false, code: "INTAKE_PAUSED", error: intakeNotice.en } as const;
}
