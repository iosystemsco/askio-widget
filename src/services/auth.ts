/**
 * Authentication service for chat widget
 * Handles JWT authentication, token caching, and renewal
 */

export interface AuthResponse {
  jwt: string;
  expires_at: string;
  session_id?: string;
}

export interface JWTPayload {
  siteToken: string;
  exp: number;
  iat: number;
}

export interface AuthConfig {
  siteToken: string;
  apiUrl?: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const AuthErrorCodes = {
  INVALID_SITE_TOKEN: 'INVALID_SITE_TOKEN',
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

/**
 * Authentication service class
 */
export class AuthService {
  private siteToken: string | null = null;
  private jwt: string | null = null;
  private jwtExpiresAt: Date | null = null;
  private apiUrl: string;
  private renewalTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<AuthConfig>) {
    this.siteToken = config?.siteToken || null;
    this.apiUrl = config?.apiUrl || this.getDefaultApiUrl();
  }

  /**
   * Get default API URL from environment or current location
   */
  private getDefaultApiUrl(): string {
    if (typeof window === 'undefined') {
      return 'http://localhost:8080';
    }

    const wsUrl = process.env.NEXT_PUBLIC_BOT_WS_URL || 'ws://localhost:8080';
    // Convert WebSocket URL to HTTP URL
    return wsUrl.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/ws$/, '');
  }

  /**
   * Set site token
   */
  setSiteToken(token: string): void {
    this.siteToken = token;
  }

  /**
   * Set API URL
   */
  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Validate site token format
   */
  private validateSiteToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    // Basic validation - token should be non-empty string
    return token.trim().length > 0;
  }

  /**
   * Check if current JWT is valid (with buffer time)
   */
  isTokenValid(bufferMinutes: number = 1): boolean {
    if (!this.jwt || !this.jwtExpiresAt) {
      return false;
    }

    const bufferMs = bufferMinutes * 60 * 1000;
    const expiryWithBuffer = new Date(this.jwtExpiresAt.getTime() - bufferMs);
    return expiryWithBuffer > new Date();
  }

  /**
   * Get current JWT token
   */
  getToken(): string | null {
    return this.jwt;
  }

  /**
   * Get token expiry date
   */
  getTokenExpiry(): Date | null {
    return this.jwtExpiresAt;
  }

  /**
   * Authenticate and get JWT token
   * Returns cached token if still valid
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid cached token
    if (this.isTokenValid()) {
      return this.jwt!;
    }

    // Validate site token
    if (!this.siteToken) {
      throw new AuthError(
        'Site token not configured',
        AuthErrorCodes.INVALID_SITE_TOKEN,
        false
      );
    }

    if (!this.validateSiteToken(this.siteToken)) {
      throw new AuthError(
        'Invalid site token format',
        AuthErrorCodes.INVALID_SITE_TOKEN,
        false
      );
    }

    try {
      const response = await fetch(`${this.apiUrl}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_token: this.siteToken,
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new AuthError(
            'Invalid site token',
            AuthErrorCodes.INVALID_SITE_TOKEN,
            false
          );
        }
        throw new AuthError(
          `Authentication failed: ${response.statusText}`,
          AuthErrorCodes.AUTH_FAILED,
          true
        );
      }

      const data: AuthResponse = await response.json();

      // Cache the token
      this.jwt = data.jwt;
      this.jwtExpiresAt = new Date(data.expires_at);

      console.log('[Auth] Authentication successful, token expires:', this.jwtExpiresAt);

      // Start automatic renewal
      this.scheduleRenewal();

      return this.jwt;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      // Network or other errors
      console.error('[Auth] Authentication error:', error);
      throw new AuthError(
        'Failed to authenticate. Please check your connection.',
        AuthErrorCodes.NETWORK_ERROR,
        true
      );
    }
  }

  /**
   * Renew JWT token
   */
  async renewToken(currentToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        // If renewal fails, try full authentication
        console.warn('[Auth] Token renewal failed, attempting full authentication');
        return await this.authenticate();
      }

      const data: AuthResponse = await response.json();

      // Update cached token
      this.jwt = data.jwt;
      this.jwtExpiresAt = new Date(data.expires_at);

      console.log('[Auth] Token renewed successfully, expires:', this.jwtExpiresAt);

      // Schedule next renewal
      this.scheduleRenewal();

      return this.jwt;
    } catch (error) {
      console.error('[Auth] Token renewal error:', error);
      // Fall back to full authentication
      return await this.authenticate();
    }
  }

  /**
   * Schedule automatic token renewal
   * Renews token 5 minutes before expiry
   */
  private scheduleRenewal(): void {
    // Clear existing timer
    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer);
      this.renewalTimer = null;
    }

    if (!this.jwtExpiresAt || !this.jwt) {
      return;
    }

    // Calculate time until renewal (5 minutes before expiry)
    const renewalBuffer = 5 * 60 * 1000; // 5 minutes
    const timeUntilRenewal = this.jwtExpiresAt.getTime() - Date.now() - renewalBuffer;

    if (timeUntilRenewal <= 0) {
      // Token already expired or about to expire, renew immediately
      this.renewToken(this.jwt).catch((error) => {
        console.error('[Auth] Automatic renewal failed:', error);
      });
      return;
    }

    console.log(`[Auth] Scheduling token renewal in ${Math.round(timeUntilRenewal / 1000)}s`);

    this.renewalTimer = setTimeout(() => {
      if (this.jwt) {
        this.renewToken(this.jwt).catch((error) => {
          console.error('[Auth] Automatic renewal failed:', error);
        });
      }
    }, timeUntilRenewal);
  }

  /**
   * Clear cached token and stop renewal
   */
  clearToken(): void {
    this.jwt = null;
    this.jwtExpiresAt = null;

    if (this.renewalTimer) {
      clearTimeout(this.renewalTimer);
      this.renewalTimer = null;
    }

    console.log('[Auth] Token cleared');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearToken();
  }
}

/**
 * Create a singleton auth service instance
 */
let authServiceInstance: AuthService | null = null;

export function getAuthService(config?: Partial<AuthConfig>): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(config);
  } else if (config) {
    // Update configuration if provided
    if (config.siteToken) {
      authServiceInstance.setSiteToken(config.siteToken);
    }
    if (config.apiUrl) {
      authServiceInstance.setApiUrl(config.apiUrl);
    }
  }
  return authServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetAuthService(): void {
  if (authServiceInstance) {
    authServiceInstance.destroy();
    authServiceInstance = null;
  }
}
