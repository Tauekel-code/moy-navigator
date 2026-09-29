// Голосовой ввод: используем встроенный в браузер Web Speech API — бесплатно,
// без сервера и ключей. Хорошо работает в Chrome (Android и десктоп); в Safari
// на iPhone поддержка ограничена и зависит от версии iOS, поэтому кнопка
// показывается только когда браузер её действительно поддерживает.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SpeechRecognitionCtor = new () => any;

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
