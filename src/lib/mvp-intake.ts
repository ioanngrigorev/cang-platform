export const intakePaused = true;

export const intakeNotice = {
  en: "This site is an MVP in development. We are currently not accepting new applications.",
  vi: "Trang web đang trong giai đoạn phát triển MVP. Chúng tôi tạm ngừng tiếp nhận yêu cầu mới.",
};

export function pausedApplication() {
  return { ok: false, code: "INTAKE_PAUSED", error: intakeNotice.en } as const;
}
