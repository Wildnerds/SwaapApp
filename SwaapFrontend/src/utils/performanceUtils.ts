import { InteractionManager, LayoutAnimation, Platform } from 'react-native';

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Execute function after interactions are complete
export const runAfterInteractions = (callback: () => void): Promise<void> => {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      callback();
      resolve();
    });
  });
};

// Batch operations for better performance
export const batchOperations = (operations: (() => void)[], batchSize: number = 5) => {
  const batches: (() => void)[][] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  
  return batches.reduce((promise, batch) => {
    return promise.then(() => {
      return new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          batch.forEach(operation => operation());
          resolve();
        });
      });
    });
  }, Promise.resolve());
};

// Animated layout transitions
export const configureLayoutAnimation = (
  type: 'spring' | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' = 'easeInOut',
  duration: number = 300
) => {
  if (Platform.OS === 'ios') {
    const animationType = {
      spring: LayoutAnimation.Types.spring,
      linear: LayoutAnimation.Types.linear,
      easeIn: LayoutAnimation.Types.easeIn,
      easeOut: LayoutAnimation.Types.easeOut,
      easeInOut: LayoutAnimation.Types.easeInEaseOut,
    };

    LayoutAnimation.configureNext({
      duration,
      create: {
        type: animationType[type],
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: animationType[type],
        property: LayoutAnimation.Properties.scaleXY,
      },
      delete: {
        type: animationType[type],
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }
};

// Memory management utilities
export const cleanupResources = () => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
};

// Image optimization utilities
export const getOptimizedImageUri = (
  originalUri: string,
  width?: number,
  height?: number,
  quality: number = 80
): string => {
  if (!originalUri) return originalUri;
  
  // For now, return original URI
  // In production, you might integrate with services like Cloudinary or similar
  return originalUri;
};

// Chunk array for pagination
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Virtual list utilities
export const getItemLayout = (
  data: any[] | null | undefined,
  index: number,
  itemHeight: number,
  headerHeight: number = 0
) => ({
  length: itemHeight,
  offset: headerHeight + itemHeight * index,
  index,
});

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private performanceMarks: Map<string, number> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  endMeasure(name: string): number {
    const startTime = this.performanceMarks.get(name);
    if (startTime) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`🔍 Performance [${name}]: ${duration}ms`);
      this.performanceMarks.delete(name);
      return duration;
    }
    return 0;
  }

  measureAsync = async <T>(name: string, asyncFn: () => Promise<T>): Promise<T> => {
    this.startMeasure(name);
    try {
      const result = await asyncFn();
      this.endMeasure(name);
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  };
}

// Smart rendering utilities
export const shouldComponentUpdate = (
  prevProps: Record<string, any>,
  nextProps: Record<string, any>,
  keysToCompare?: string[]
): boolean => {
  const keys = keysToCompare || Object.keys(nextProps);
  
  return keys.some(key => {
    if (Array.isArray(prevProps[key]) && Array.isArray(nextProps[key])) {
      return JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key]);
    }
    return prevProps[key] !== nextProps[key];
  });
};

// Batch state updates
export const createBatchUpdater = <T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  delay: number = 100
) => {
  let pendingUpdates: ((prev: T) => T)[] = [];
  let timeoutId: NodeJS.Timeout;

  return (updater: (prev: T) => T) => {
    pendingUpdates.push(updater);
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      setState(prev => {
        let result = prev;
        pendingUpdates.forEach(update => {
          result = update(result);
        });
        pendingUpdates = [];
        return result;
      });
    }, delay);
  };
};