/**
 * LLM Module Exports
 *
 * Provides access to LM Studio integration for function calling.
 */

// Functions definitions
export {
  llmFunctions,
  getFunctionDefinitions,
  getFunctionByName,
  getFunctionNames,
  type FunctionDefinition,
} from './functions';

// Function handlers
export {
  executeFunction,
  getAvailableFunctions,
  type FunctionHandler,
  type FunctionResult,
} from './handlers';

// LM Studio client
export {
  LMStudioClient,
  getLMStudioClient,
  createLMStudioClient,
  quickChat,
  callFunction,
  checkLMStudioConnection,
  type ConversationContext,
} from './client';
