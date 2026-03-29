/** In-memory mock “email” log for demo */
const log: Array<{ at: string; to: string; subject: string; body: string }> = [];

export function sendMockEmail(to: string, subject: string, body: string) {
  log.unshift({
    at: new Date().toISOString(),
    to,
    subject,
    body,
  });
  if (log.length > 200) log.pop();
}

export function getMockEmailLog() {
  return [...log];
}
