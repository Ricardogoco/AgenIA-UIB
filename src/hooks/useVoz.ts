import { useCallback, useEffect, useRef, useState } from "react";

type Reconocedor = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((evento: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function crearReconocedor(): Reconocedor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w["SpeechRecognition"] ?? w["webkitSpeechRecognition"]) as
    | (new () => Reconocedor)
    | undefined;
  if (!Ctor) return null;
  return new Ctor();
}

/** Dictado con la voz del teléfono. Devuelve el texto acumulado. */
export function useVoz(alTexto?: (texto: string) => void) {
  const [soportado, setSoportado] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const refReconocedor = useRef<Reconocedor | null>(null);
  const refFinal = useRef("");
  const refCallback = useRef(alTexto);
  refCallback.current = alTexto;

  useEffect(() => {
    setSoportado(Boolean(crearReconocedor()));
  }, []);

  const detener = useCallback(() => {
    refReconocedor.current?.stop();
    refReconocedor.current = null;
    setEscuchando(false);
  }, []);

  const iniciar = useCallback((textoPrevio = "") => {
    const reconocedor = crearReconocedor();
    if (!reconocedor) return;
    refFinal.current = textoPrevio ? `${textoPrevio} ` : "";
    reconocedor.lang = "es-CO";
    reconocedor.continuous = true;
    reconocedor.interimResults = true;
    reconocedor.onresult = (evento: unknown) => {
      const e = evento as {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      };
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (!r) continue;
        if (r.isFinal) refFinal.current += `${r[0].transcript} `;
        else parcial += r[0].transcript;
      }
      refCallback.current?.((refFinal.current + parcial).trim());
    };
    reconocedor.onend = () => setEscuchando(false);
    reconocedor.onerror = () => setEscuchando(false);
    refReconocedor.current = reconocedor;
    reconocedor.start();
    setEscuchando(true);
  }, []);

  useEffect(() => () => refReconocedor.current?.stop(), []);

  return { soportado, escuchando, iniciar, detener };
}

/** Lectura en voz alta de una lista o nota. */
export function leerEnVozAlta(texto: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const mensaje = new SpeechSynthesisUtterance(texto);
  mensaje.lang = "es-CO";
  window.speechSynthesis.speak(mensaje);
  return true;
}
