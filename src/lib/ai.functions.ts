import { createServerFn } from "@tanstack/react-start";
import { Output, streamText } from "ai";
import { z } from "zod";

import { crearModeloLovable, opcionesRazonamiento } from "./ai-gateway.server";

/* ---------- Captura por voz o texto: una frase -> varios registros ---------- */

const PlanSchema = z.object({
  entendido: z.string(),
  espacio: z.string(),
  tareas: z.array(
    z.object({
      titulo: z.string(),
      fecha: z.string(),
      hora: z.string(),
      avisoMin: z.number(),
    }),
  ),
  citas: z.array(
    z.object({
      titulo: z.string(),
      fecha: z.string(),
      hora: z.string(),
      avisoMin: z.number(),
      lugar: z.string(),
    }),
  ),
  movimientos: z.array(
    z.object({
      tipo: z.string(),
      concepto: z.string(),
      monto: z.number(),
      cuenta: z.string(),
      categoria: z.string(),
      fecha: z.string(),
    }),
  ),
  obligaciones: z.array(
    z.object({
      concepto: z.string(),
      monto: z.number(),
      vence: z.string(),
    }),
  ),
  deudas: z.array(
    z.object({
      titulo: z.string(),
      total: z.number(),
      tipo: z.string(),
    }),
  ),
  arriendos: z.array(
    z.object({
      inmueble: z.string(),
      mes: z.string(),
      esperado: z.number(),
      pagado: z.number(),
      cuenta: z.string(),
    }),
  ),
  compras: z.array(
    z.object({
      tienda: z.string(),
      items: z.array(z.object({ nombre: z.string(), cantidad: z.string() })),
    }),
  ),
  notas: z.array(z.object({ titulo: z.string(), texto: z.string() })),
  preguntas: z.array(z.string()),
});

export type PlanCaptura = z.infer<typeof PlanSchema>;

const EntradaCaptura = z.object({
  texto: z.string().min(1),
  espacios: z.array(z.string()),
  hoy: z.string(),
});

export const interpretarCaptura = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EntradaCaptura.parse(input))
  .handler(async ({ data }): Promise<PlanCaptura> => {
    const resultado = streamText({
      model: crearModeloLovable(),
      output: Output.object({ schema: PlanSchema }),
      providerOptions: opcionesRazonamiento,
      system: [
        "Eres el motor de captura de AgenIA-UIB, una app de organización personal en español.",
        "Recibes una frase dictada o escrita y la conviertes en registros concretos.",
        "Reglas estrictas:",
        "- No inventes montos, fechas ni horas. Si un dato no está en la frase, deja el texto vacío o el número en 0 y agrega una pregunta corta en 'preguntas'.",
        "- Una deuda pendiente NO es un pago realizado. 'Debo pagarle 20 mil a mi abuela' crea una deuda, no un movimiento.",
        "- Un pago ya hecho ('pagué', 'transferí') crea un movimiento de tipo 'gasto'.",
        "- Un pago futuro con fecha de vencimiento crea una 'obligación'.",
        "- 'tipo' en movimientos solo puede ser 'gasto' o 'ingreso'. 'tipo' en deudas solo 'debo' o 'meDeben'.",
        "- Fechas siempre en formato AAAA-MM-DD y horas en HH:MM de 24 horas.",
        `- Fecha de hoy: ${data.hoy}. Interpreta 'mañana', 'el jueves', 'en septiembre' respecto a ella.`,
        "- avisoMin es el aviso previo en minutos; usa 30 si no se indica.",
        "- Montos en números enteros. 'veinte mil' = 20000, '1.2 millones' = 1200000.",
        `- Espacios disponibles: ${data.espacios.join(", ")}. Elige el más adecuado; si la frase no lo indica usa el primero.`,
        "- 'entendido' es una confirmación breve en español, en una sola frase.",
        "- Deja vacías las listas que no apliquen.",
      ].join("\n"),
      prompt: data.texto,
    });

    return await resultado.output;
  });

/* ---------- Reuniones: resumen, compromisos y mapa mental ---------- */

const ReunionSchema = z.object({
  titulo: z.string(),
  resumen: z.string(),
  temas: z.array(z.object({ titulo: z.string(), puntos: z.array(z.string()) })),
  decisiones: z.array(z.string()),
  pendientes: z.array(z.string()),
  compromisos: z.array(
    z.object({ titulo: z.string(), responsable: z.string(), fecha: z.string() }),
  ),
  mapa: z.object({
    centro: z.string(),
    ramas: z.array(z.object({ titulo: z.string(), hijos: z.array(z.string()) })),
  }),
  acta: z.string(),
});

export type AnalisisReunion = z.infer<typeof ReunionSchema>;

export const analizarReunion = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ transcripcion: z.string().min(1), titulo: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<AnalisisReunion> => {
    const resultado = streamText({
      model: crearModeloLovable(),
      output: Output.object({ schema: ReunionSchema }),
      providerOptions: opcionesRazonamiento,
      system: [
        "Analizas transcripciones de reuniones presenciales en español (juntas comunales, fundaciones, equipos de trabajo).",
        "Separa claramente propuestas, decisiones aprobadas y asuntos pendientes.",
        "Conserva cifras, fechas, votaciones y desacuerdos relevantes.",
        "No inventes asistentes, responsables ni acuerdos: si no consta, deja el campo vacío.",
        "El acta es un BORRADOR pendiente de revisión; redáctala en párrafos claros.",
        "El mapa mental tiene un tema central y ramas con subtemas.",
      ].join("\n"),
      prompt: `Título de referencia: ${data.titulo || "Reunión sin título"}\n\nTranscripción:\n${data.transcripcion}`,
    });

    return await resultado.output;
  });

/* ---------- Asistente de consulta ---------- */

export const consultarAsistente = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ pregunta: z.string().min(1), contexto: z.string() }).parse(input),
  )
  .handler(async ({ data }): Promise<string> => {
    const resultado = streamText({
      model: crearModeloLovable(),
      providerOptions: opcionesRazonamiento,
      system: [
        "Eres el asistente de AgenIA-UIB. Respondes en español, breve y concreto.",
        "Usas únicamente la información del contexto para responder sobre los datos del usuario.",
        "Si el dato no está en el contexto, dilo con claridad en una frase.",
        "No inventes montos ni fechas.",
      ].join("\n"),
      prompt: `Datos del usuario:\n${data.contexto}\n\nPregunta: ${data.pregunta}`,
    });

    return await resultado.text;
  });
