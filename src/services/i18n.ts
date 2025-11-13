/**
 * Internationalization service for chat widget
 * Supports dynamic translation loading and caching
 */

export interface Translations {
  [key: string]: string | Translations;
}

export interface I18nConfig {
  defaultLanguage?: string;
  fallbackLanguage?: string;
}

export class I18nError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'I18nError';
  }
}

/**
 * I18n service class
 */
export class I18nService {
  private translations: Map<string, Translations> = new Map();
  private currentLanguage: string;
  private fallbackLanguage: string;
  private loadedLanguages: Set<string> = new Set();

  constructor(config?: I18nConfig) {
    this.currentLanguage = config?.defaultLanguage || 'en';
    this.fallbackLanguage = config?.fallbackLanguage || 'en';
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  async setLanguage(language: string): Promise<void> {
    if (!this.isLanguageSupported(language)) {
      console.warn(`[I18n] Language '${language}' not supported, using fallback`);
      language = this.fallbackLanguage;
    }

    // Load language if not already loaded
    if (!this.loadedLanguages.has(language)) {
      await this.loadLanguage(language);
    }

    this.currentLanguage = language;
    console.log('[I18n] Language set to:', language);
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'pt'];
    return supportedLanguages.includes(language);
  }

  /**
   * Load language translations
   */
  async loadLanguage(language: string): Promise<void> {
    if (this.loadedLanguages.has(language)) {
      return;
    }

    try {
      // Get translations for the language
      const translations = this.getLanguageTranslations(language);
      this.translations.set(language, translations);
      this.loadedLanguages.add(language);
      console.log('[I18n] Loaded translations for:', language);
    } catch (error) {
      console.error(`[I18n] Failed to load language '${language}':`, error);
      throw new I18nError(`Failed to load language: ${language}`);
    }
  }

  /**
   * Get translations for a language
   * In a real implementation, this would load from JSON files or API
   */
  private getLanguageTranslations(language: string): Translations {
    // Define translations inline for now
    // In production, these would be loaded from separate JSON files
    const translationsMap: Record<string, Translations> = {
      en: {
        chat: {
          title: 'AI Assistant',
          placeholder: 'Type a message...',
          send: 'Send',
          connecting: 'Connecting...',
          connected: 'Connected',
          disconnected: 'Disconnected',
          reconnect: 'Reconnect',
          listening: 'Listening...',
          thinking: 'Thinking...',
          welcome: 'Welcome! How can I help you today?',
          askMe: 'Ask me anything!',
          tryQuestions: 'Try asking:',
          connectionLost: 'Connection lost',
          closeChat: 'Close chat',
          chatWithAI: 'Chat with AI',
          listeningSpeak: 'Listening... Speak now',
          suggestions: {
            whatIsCreastat: 'What is Creastat?',
            howMuchCost: 'How much does it cost?',
            whatFeatures: 'What features do you offer?',
            howGetStarted: 'How do I get started?',
          },
          errors: {
            authFailed: 'Authentication failed',
            connectionLost: 'Connection lost',
            micPermission: 'Microphone permission denied',
            audioFailed: 'Voice input unavailable',
            notConnected: 'Not connected to chat service',
            sendFailed: 'Failed to send message',
          },
        },
      },
      es: {
        chat: {
          title: 'Asistente IA',
          placeholder: 'Escribe un mensaje...',
          send: 'Enviar',
          connecting: 'Conectando...',
          connected: 'Conectado',
          disconnected: 'Desconectado',
          reconnect: 'Reconectar',
          listening: 'Escuchando...',
          thinking: 'Pensando...',
          welcome: '¡Bienvenido! ¿Cómo puedo ayudarte hoy?',
          askMe: '¡Pregúntame lo que quieras!',
          tryQuestions: 'Prueba a preguntar:',
          connectionLost: 'Conexión perdida',
          closeChat: 'Cerrar chat',
          chatWithAI: 'Chatear con IA',
          listeningSpeak: 'Escuchando... Habla ahora',
          suggestions: {
            whatIsCreastat: '¿Qué es Creastat?',
            howMuchCost: '¿Cuánto cuesta?',
            whatFeatures: '¿Qué características ofrecen?',
            howGetStarted: '¿Cómo empiezo?',
          },
          errors: {
            authFailed: 'Autenticación fallida',
            connectionLost: 'Conexión perdida',
            micPermission: 'Permiso de micrófono denegado',
            audioFailed: 'Entrada de voz no disponible',
            notConnected: 'No conectado al servicio de chat',
            sendFailed: 'Error al enviar mensaje',
          },
        },
      },
      fr: {
        chat: {
          title: 'Assistant IA',
          placeholder: 'Tapez un message...',
          send: 'Envoyer',
          connecting: 'Connexion...',
          connected: 'Connecté',
          disconnected: 'Déconnecté',
          reconnect: 'Reconnecter',
          listening: 'Écoute...',
          thinking: 'Réflexion...',
          welcome: 'Bienvenue! Comment puis-je vous aider aujourd\'hui?',
          askMe: 'Demandez-moi n\'importe quoi!',
          tryQuestions: 'Essayez de demander:',
          connectionLost: 'Connexion perdue',
          closeChat: 'Fermer le chat',
          chatWithAI: 'Discuter avec l\'IA',
          listeningSpeak: 'Écoute... Parlez maintenant',
          suggestions: {
            whatIsCreastat: 'Qu\'est-ce que Creastat?',
            howMuchCost: 'Combien ça coûte?',
            whatFeatures: 'Quelles fonctionnalités offrez-vous?',
            howGetStarted: 'Comment commencer?',
          },
          errors: {
            authFailed: 'Échec de l\'authentification',
            connectionLost: 'Connexion perdue',
            micPermission: 'Permission du microphone refusée',
            audioFailed: 'Entrée vocale indisponible',
            notConnected: 'Non connecté au service de chat',
            sendFailed: 'Échec de l\'envoi du message',
          },
        },
      },
      de: {
        chat: {
          title: 'KI-Assistent',
          placeholder: 'Nachricht eingeben...',
          send: 'Senden',
          connecting: 'Verbinden...',
          connected: 'Verbunden',
          disconnected: 'Getrennt',
          reconnect: 'Neu verbinden',
          listening: 'Zuhören...',
          thinking: 'Denken...',
          welcome: 'Willkommen! Wie kann ich Ihnen heute helfen?',
          askMe: 'Fragen Sie mich alles!',
          tryQuestions: 'Versuchen Sie zu fragen:',
          connectionLost: 'Verbindung verloren',
          closeChat: 'Chat schließen',
          chatWithAI: 'Mit KI chatten',
          listeningSpeak: 'Zuhören... Sprechen Sie jetzt',
          suggestions: {
            whatIsCreastat: 'Was ist Creastat?',
            howMuchCost: 'Wie viel kostet es?',
            whatFeatures: 'Welche Funktionen bieten Sie?',
            howGetStarted: 'Wie fange ich an?',
          },
          errors: {
            authFailed: 'Authentifizierung fehlgeschlagen',
            connectionLost: 'Verbindung verloren',
            micPermission: 'Mikrofonberechtigung verweigert',
            audioFailed: 'Spracheingabe nicht verfügbar',
            notConnected: 'Nicht mit Chat-Service verbunden',
            sendFailed: 'Nachricht konnte nicht gesendet werden',
          },
        },
      },
      pt: {
        chat: {
          title: 'Assistente IA',
          placeholder: 'Digite uma mensagem...',
          send: 'Enviar',
          connecting: 'Conectando...',
          connected: 'Conectado',
          disconnected: 'Desconectado',
          reconnect: 'Reconectar',
          listening: 'Ouvindo...',
          thinking: 'Pensando...',
          welcome: 'Bem-vindo! Como posso ajudá-lo hoje?',
          askMe: 'Pergunte-me qualquer coisa!',
          tryQuestions: 'Tente perguntar:',
          connectionLost: 'Conexão perdida',
          closeChat: 'Fechar chat',
          chatWithAI: 'Conversar com IA',
          listeningSpeak: 'Ouvindo... Fale agora',
          suggestions: {
            whatIsCreastat: 'O que é Creastat?',
            howMuchCost: 'Quanto custa?',
            whatFeatures: 'Quais recursos vocês oferecem?',
            howGetStarted: 'Como começar?',
          },
          errors: {
            authFailed: 'Falha na autenticação',
            connectionLost: 'Conexão perdida',
            micPermission: 'Permissão de microfone negada',
            audioFailed: 'Entrada de voz indisponível',
            notConnected: 'Não conectado ao serviço de chat',
            sendFailed: 'Falha ao enviar mensagem',
          },
        },
      },
    };

    return translationsMap[language] || translationsMap['en'];
  }

  /**
   * Translate a key
   * Supports nested keys with dot notation (e.g., 'chat.title')
   */
  t(key: string, params?: Record<string, string>): string {
    const translations = this.translations.get(this.currentLanguage);
    if (!translations) {
      // Try to load current language
      this.loadLanguage(this.currentLanguage).catch(() => {
        console.warn(`[I18n] Failed to load language: ${this.currentLanguage}`);
      });
      return key;
    }

    let value = this.getNestedValue(translations, key);

    // Fallback to fallback language if not found
    if (!value && this.currentLanguage !== this.fallbackLanguage) {
      const fallbackTranslations = this.translations.get(this.fallbackLanguage);
      if (fallbackTranslations) {
        value = this.getNestedValue(fallbackTranslations, key);
      }
    }

    // Return key if translation not found
    if (!value) {
      console.warn(`[I18n] Translation not found for key: ${key}`);
      return key;
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`{{${k}}}`, 'g'), v);
      });
    }

    return value;
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): string {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return '';
      }
    }

    return typeof current === 'string' ? current : '';
  }

  /**
   * Get all translations for current language
   */
  getTranslations(): Translations | undefined {
    return this.translations.get(this.currentLanguage);
  }

  /**
   * Preload multiple languages
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    const promises = languages.map((lang) => this.loadLanguage(lang));
    await Promise.all(promises);
    console.log('[I18n] Preloaded languages:', languages);
  }

  /**
   * Clear all cached translations
   */
  clearCache(): void {
    this.translations.clear();
    this.loadedLanguages.clear();
    console.log('[I18n] Cache cleared');
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): string[] {
    return ['en', 'es', 'fr', 'de', 'pt'];
  }

  /**
   * Detect browser language
   */
  detectBrowserLanguage(): string {
    if (typeof window === 'undefined' || !window.navigator) {
      return this.fallbackLanguage;
    }

    const browserLang = window.navigator.language.split('-')[0];
    return this.isLanguageSupported(browserLang) ? browserLang : this.fallbackLanguage;
  }
}

/**
 * Create a singleton i18n service instance
 */
let i18nServiceInstance: I18nService | null = null;

export function getI18nService(config?: I18nConfig): I18nService {
  if (!i18nServiceInstance) {
    i18nServiceInstance = new I18nService(config);
  }
  return i18nServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetI18nService(): void {
  if (i18nServiceInstance) {
    i18nServiceInstance.clearCache();
    i18nServiceInstance = null;
  }
}
