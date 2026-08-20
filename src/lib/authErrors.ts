/**
 * Maps Firebase Auth error codes to user-friendly, actionable error messages.
 */
export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unexpected authentication error occurred. Please try again.';
  }

  // Extract error code if present
  let code = '';
  let rawMessage = '';

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.code === 'string') {
      code = errObj.code.toLowerCase().trim();
    }
    if (typeof errObj.message === 'string') {
      rawMessage = errObj.message;
    }
  } else if (typeof error === 'string') {
    rawMessage = error;
  }

  // If code is not explicitly set, attempt to extract auth/code pattern from the message
  if (!code && rawMessage) {
    const codeMatch = rawMessage.match(/auth\/[a-zA-Z0-9-]+/i);
    if (codeMatch) {
      code = codeMatch[0].toLowerCase();
    }
  }

  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your spelling or click "Create Account" to sign up.';

    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'No account found for this email address or incorrect password. If you are new to Tracklet, please click "Create Account" to sign up.';

    case 'auth/wrong-password':
      return 'Incorrect password. Please verify your password or click "Forgot password?" to reset it.';

    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please click "Sign In" instead, or reset your password if forgotten.';

    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'This sign-in method is temporarily unavailable. Please try again later or sign in with Google.';

    case 'auth/weak-password':
      return 'Password is too weak. Please choose a password with at least 6 characters (mix of letters and numbers).';

    case 'auth/invalid-email':
      return 'Please enter a valid email address (e.g. name@example.com).';

    case 'auth/missing-password':
      return 'Please enter your password.';

    case 'auth/missing-email':
      return 'Please enter your email address.';

    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';

    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily restricted due to many failed attempts. Please try again in a few minutes or reset your password.';

    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and try again.';

    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled because the popup was closed before completing authentication.';

    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.';

    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in using that method.';

    case 'auth/requires-recent-login':
      return 'For your security, please sign in again before deleting your account.';

    case 'auth/expired-action-code':
      return 'The verification or password reset link has expired. Please request a new one.';

    case 'auth/invalid-action-code':
      return 'The verification or password reset link is invalid or has already been used.';

    case 'auth/credential-already-in-use':
      return 'This credential is already linked to another user account.';

    case 'auth/user-token-expired':
      return 'Your authentication session has expired. Please sign in again.';

    case 'auth/internal-error':
      return 'An internal authentication error occurred. Please try again in a moment.';

    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in your Firebase Auth settings. Please add your host in Firebase Console > Authentication > Settings > Authorized domains.';

    default: {
      if (rawMessage) {
        // Clean out Firebase wrapper boilerplate while keeping the actual message
        const cleaned = rawMessage
          .replace(/^Firebase:\s*/i, '')
          .replace(/\s*\(auth\/[^)]+\)\.?$/i, '')
          .trim();

        if (cleaned && cleaned !== 'Error' && cleaned.length > 5) {
          return cleaned;
        }
      }
      return 'Authentication failed. Please verify your email and password, or click "Create Account" if you are a new user.';
    }
  }
}
