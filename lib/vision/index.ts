/**
 * Vision Module
 * Exports food recognition functionality
 */

export {
  type RecognitionResult,
  loadModel,
  isModelLoaded,
  imageToBase64,
  recognizeFood,
  fileToImageElement,
  urlToImageElement,
  recognizeFoodFromFile,
  recognizeFoodFromUrl,
} from './foodRecognition';
