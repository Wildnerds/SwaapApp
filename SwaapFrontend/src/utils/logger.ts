// Frontend logging utility for production-ready app
import AsyncStorage from '@react-native-async-storage/async-storage';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Log entry interface
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  metadata?: any;
  userId?: string;
  screen?: string;
  action?: string;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR;
  private maxLogs = 1000; // Maximum logs to store locally
  private logs: LogEntry[] = [];
  
  private constructor() {
    this.loadLogsFromStorage();
  }
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  // Set log level
  public setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }
  
  // Debug logging (only in development)
  public debug(message: string, metadata?: any) {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.addLog(LogLevel.DEBUG, message, metadata);
      if (__DEV__) {
        console.log(`[DEBUG] ${message}`, metadata || '');
      }
    }
  }
  
  // Info logging
  public info(message: string, metadata?: any) {
    if (this.logLevel <= LogLevel.INFO) {
      this.addLog(LogLevel.INFO, message, metadata);
      if (__DEV__) {
        console.info(`[INFO] ${message}`, metadata || '');
      }
    }
  }
  
  // Warning logging
  public warn(message: string, metadata?: any) {
    if (this.logLevel <= LogLevel.WARN) {
      this.addLog(LogLevel.WARN, message, metadata);
      if (__DEV__) {
        console.warn(`[WARN] ${message}`, metadata || '');
      }
    }
  }
  
  // Error logging (always logged)
  public error(message: string, error?: Error, metadata?: any) {
    const errorData = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.addLog(LogLevel.ERROR, message, errorData);
    
    if (__DEV__) {
      console.error(`[ERROR] ${message}`, error || '', metadata || '');
    }
    
    // In production, you might want to send errors to a remote service
    if (!__DEV__) {
      this.sendErrorToRemoteService(message, errorData);
    }
  }
  
  // API request logging
  public apiRequest(url: string, method: string, status?: number, duration?: number) {
    const metadata = {
      url,
      method,
      status,
      duration: duration ? `${duration}ms` : undefined
    };
    
    if (status && status >= 400) {
      this.warn(`API request failed: ${method} ${url}`, metadata);
    } else {
      this.debug(`API request: ${method} ${url}`, metadata);
    }
  }
  
  // User action logging
  public userAction(action: string, screen: string, metadata?: any) {
    this.info(`User action: ${action}`, {
      screen,
      action,
      ...metadata
    });
  }
  
  // Performance logging
  public performance(operation: string, duration: number, metadata?: any) {
    const performanceData = {
      operation,
      duration: `${duration}ms`,
      ...metadata
    };
    
    if (duration > 1000) {
      this.warn(`Slow operation: ${operation}`, performanceData);
    } else {
      this.debug(`Performance: ${operation}`, performanceData);
    }
  }
  
  // Navigation logging
  public navigation(from: string, to: string, params?: any) {
    this.debug(`Navigation: ${from} -> ${to}`, { from, to, params });
  }
  
  // Add log entry
  private addLog(level: LogLevel, message: string, metadata?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      metadata
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Save to storage (debounced)
    this.saveLogsToStorageDebounced();
  }
  
  // Debounced save to storage
  private saveTimeout?: NodeJS.Timeout;
  private saveLogsToStorageDebounced() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveLogsToStorage();
    }, 1000); // Save after 1 second of inactivity
  }
  
  // Save logs to AsyncStorage
  private async saveLogsToStorage() {
    try {
      await AsyncStorage.setItem('@app_logs', JSON.stringify(this.logs));
    } catch (error) {
      // Don't log this error to avoid infinite loop
      if (__DEV__) {
        console.error('Failed to save logs to storage:', error);
      }
    }
  }
  
  // Load logs from AsyncStorage
  private async loadLogsFromStorage() {
    try {
      const savedLogs = await AsyncStorage.getItem('@app_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (error) {
      // Don't log this error to avoid infinite loop
      if (__DEV__) {
        console.error('Failed to load logs from storage:', error);
      }
    }
  }
  
  // Get logs (for debugging or support)
  public getLogs(level?: LogLevel, limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level !== undefined) {
      filteredLogs = this.logs.filter(log => log.level >= level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }
    
    return filteredLogs;
  }
  
  // Clear logs
  public clearLogs() {
    this.logs = [];
    this.saveLogsToStorage();
  }
  
  // Export logs (for support purposes)
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
  
  // Send error to remote service (implement based on your backend)
  private async sendErrorToRemoteService(message: string, errorData: any) {
    try {
      // Example implementation - replace with your actual error reporting service
      // await fetch('https://your-api.com/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     message,
      //     errorData,
      //     timestamp: Date.now(),
      //     platform: Platform.OS,
      //     appVersion: '1.0.0' // Get from app config
      //   })
      // });
    } catch (error) {
      // Silently fail - don't create more errors
    }
  }
}

// Create singleton instance
const logger = Logger.getInstance();

// Export logger instance and convenience functions
export { logger };

// Convenience functions
export const logDebug = (message: string, metadata?: any) => logger.debug(message, metadata);
export const logInfo = (message: string, metadata?: any) => logger.info(message, metadata);
export const logWarn = (message: string, metadata?: any) => logger.warn(message, metadata);
export const logError = (message: string, error?: Error, metadata?: any) => logger.error(message, error, metadata);
export const logApiRequest = (url: string, method: string, status?: number, duration?: number) => 
  logger.apiRequest(url, method, status, duration);
export const logUserAction = (action: string, screen: string, metadata?: any) => 
  logger.userAction(action, screen, metadata);
export const logPerformance = (operation: string, duration: number, metadata?: any) => 
  logger.performance(operation, duration, metadata);
export const logNavigation = (from: string, to: string, params?: any) => 
  logger.navigation(from, to, params);

// Override console methods in production to prevent logs from appearing
if (!__DEV__) {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  // Keep console.warn and console.error for critical issues
}