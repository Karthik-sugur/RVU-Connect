import { logger } from './logger.js';

export function handleFirebaseError(error, context = "An operation failed") {
  logger.error(`${context}: ${error.code || error.message}`, error);
  
  let userFriendlyMessage = "An unexpected error occurred. Please try again.";
  
  switch (error.code) {
    case "permission-denied":
      userFriendlyMessage = "You don't have permission to perform this action.";
      break;
    case "unavailable":
      userFriendlyMessage = "Network error. Please check your connection.";
      break;
    case "unauthenticated":
      userFriendlyMessage = "Please sign in to continue.";
      break;
    case "already-exists":
      userFriendlyMessage = "This item already exists.";
      break;
    case "not-found":
      userFriendlyMessage = "The requested item was not found.";
      break;
  }
  
  showToast(userFriendlyMessage, "error");
  return userFriendlyMessage;
}

export function showToast(message, type = "info") {
  // Try to dispatch an event that ui.js listens to, or directly manipulate DOM
  window.dispatchEvent(new CustomEvent("rvu-toast", { detail: { message, type } }));
}
