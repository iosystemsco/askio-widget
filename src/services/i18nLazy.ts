/**
 * Lazy-loaded i18n service
 * Dynamically loads translation files only when needed
 */

import type { Translations } from './i18n';

interface TranslationModule {
  default: Translations;
}

/**
 * Lazy translation loader
 * Loads translation files on-demand to reduce initial bundle size
 */
export class LazyI18nService {
  private translations: Map<string, Translations> = new Map();
  private loadingPromises: Map<string, Promise<void>> = new Map();
  private currentLanguage: string = 'en';
  private fallbackLanguage: string = 'en';

  constructor(defaultLanguage: string = 'en') {
    this.currentLanguage = defaultLanguage;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Set current language and load translations
   */
  async setLanguage(language: string): Promise<void> {
    if (!this.isLanguageSupported(language)) {
      console.warn(`[LazyI18n] Language '${language}' not supported, using fallback`);
      language = this.fallbackLanguage;
    }

    await this.loadLanguage(language);
    this.currentLanguage = language;
    console.log('[LazyI18n] Language set to:', language);
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    const supportedLanguages = ['en', 'es', 'fr', 'de', 'pt'];
    return supportedLanguages.includes(language);
  }

  /**
   * Lazy load language translations
   */
  async loadLanguage(language: string): Promise<void> {
    // Return if already loaded
    if (this.translations.has(language)) {
      return;
    }

    // Return existing loading promise if in progress
    if (this.loadingPromises.has(language)) {
      return this.loadingPromises.get(language);
    }

    // Create loading promise
    const loadingPromise = this.loadTranslationModule(language);
    this.loadingPromises.set(language, loadingPromise);

    try {
      await loadingPromise;
    } finally {
      this.loadingPromises.delete(language);
    }
  }

  /**
   * Load translation module dynamically
   */
  private async loadTranslationModule(language: string): Promise<void> {
    try {
      let module: TranslationModule;

      // Dynamic import based on language
      switch (language) {
        case 'en':
          module = await import('../locales/en.json');
          break;
        case 'es':
          module = await import('../locales/es.json');
          break;
        case 'fr':
          module = await import('../locales/fr.json');
          break;
        case 'de':
          module = await import('../locales/de.json');
          break;
        case 'pt':
          module = await import('../locales/pt.json');
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      this.translations.set(language, module.default);
      console.log('[LazyI18n] Loaded translations for:', language);
    } catch (error) {
      console.error(`[LazyI18n] Failed to load language '${language}':`, error);
      throw error;
    }
  }

  /**
   * Translate a key
   */
  t(key: string, params?: Record<string, string>): string {
    const translations = this.translations.get(this.currentLanguage);
    
    if (!translations) {
      // Return key if translations not loaded yet
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
   * Preload multiple languages
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    const promises = languages.map((lang) => this.loadLanguage(lang));
    await Promise.all(promises);
    console.log('[LazyI18n] Preloaded languages:', languages);
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
 * Create a singleton lazy i18n service instance
 */
let lazyI18nServiceInstance: LazyI18nService | null = null;

export function getLazyI18nService(defaultLanguage?: string): LazyI18nService {
  if (!lazyI18nServiceInstance) {
    lazyI18nServiceInstance = new LazyI18nService(defaultLanguage);
  }
  return lazyI18nServiceInstance;
}
