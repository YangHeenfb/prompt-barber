import { createBarberCopyFallback } from "./barberCopyFallback";
import type { BarberCopyInput } from "./barberCopyInput";
import type { BarberCopyResponse } from "./barberCopySchema";
import { validateBarberCopyResponse } from "./barberCopySchema";

type BarberCopyApiResponse =
  | { ok: true; copy: BarberCopyResponse }
  | { ok: false; copy: BarberCopyResponse; reason: string };

export async function getBarberCopy(input: BarberCopyInput): Promise<BarberCopyResponse> {
  const fallback = createBarberCopyFallback(input);
  const { stepIndex: _stepIndex, ...requestBody } = input;
  try {
    const response = await fetch("/api/barber-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const data = (await response.json()) as BarberCopyApiResponse;
    if (data.ok && validateBarberCopyResponse(data.copy)) {
      return data.copy;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export { createBarberCopyFallback as createBarberCopy };
export type { BarberCopyResponse as BarberCopy };
