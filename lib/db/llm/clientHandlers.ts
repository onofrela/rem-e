/**
 * Client-Side Handler Executor
 *
 * Ejecuta los handlers en el cliente donde IndexedDB está disponible.
 * Este módulo es el equivalente del lado del cliente de handlers.ts,
 * pero se ejecuta en el navegador con acceso a IndexedDB local.
 */

import { executeFunction, type FunctionResult } from './handlers';

export type { FunctionResult };

/**
 * Ejecuta una función en el cliente (navegador)
 * donde IndexedDB está disponible.
 */
export async function executeClientFunction(
  functionName: string,
  args: Record<string, unknown>
): Promise<FunctionResult> {
  console.log(`[ClientHandlers] Executing function on client: ${functionName}`, args);

  try {
    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'Esta función debe ejecutarse en el cliente (navegador), no en el servidor.',
      };
    }

    // Ejecutar la función usando el handler existente
    const result = await executeFunction(functionName, args);

    console.log(`[ClientHandlers] Function result:`, result);
    return result;
  } catch (error) {
    console.error(`[ClientHandlers] Error executing function:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido ejecutando función',
    };
  }
}

/**
 * Ejecuta múltiples funciones en secuencia en el cliente
 */
export async function executeClientFunctions(
  functionCalls: Array<{
    name: string;
    args: Record<string, unknown>;
  }>
): Promise<Array<{ name: string; args: Record<string, unknown>; result: FunctionResult }>> {
  const results = [];

  for (const call of functionCalls) {
    const result = await executeClientFunction(call.name, call.args);
    results.push({
      name: call.name,
      args: call.args,
      result,
    });
  }

  return results;
}
