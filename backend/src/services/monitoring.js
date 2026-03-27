import { useAzureMonitor } from '@azure/monitor-opentelemetry';

// Initialize Application Insights monitoring
export const initializeMonitoring = () => {
  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn('⚠️  Application Insights connection string not configured');
    console.warn('   Set APPLICATIONINSIGHTS_CONNECTION_STRING to enable monitoring');
    return false;
  }

  try {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString
      },
      samplingRatio: parseFloat(process.env.APPINSIGHTS_SAMPLING_RATIO || '1.0'),
      enableAutoCollectExceptions: true,
      enableAutoCollectPerformance: true,
      enableAutoCollectRequests: true,
      enableAutoCollectDependencies: true,
      enableAutoCollectConsole: process.env.NODE_ENV === 'production',
    });

    console.log('✅ Application Insights monitoring initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Application Insights:', error.message);
    return false;
  }
};

// Custom telemetry tracking helpers
export const trackEvent = (name, properties = {}) => {
  if (global.appInsights) {
    global.appInsights.defaultClient.trackEvent({
      name,
      properties: {
        ...properties,
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const trackMetric = (name, value, properties = {}) => {
  if (global.appInsights) {
    global.appInsights.defaultClient.trackMetric({
      name,
      value,
      properties
    });
  }
};

export const trackException = (exception, properties = {}) => {
  if (global.appInsights) {
    global.appInsights.defaultClient.trackException({
      exception,
      properties: {
        ...properties,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    console.error('Exception tracked:', exception, properties);
  }
};

export default {
  initializeMonitoring,
  trackEvent,
  trackMetric,
  trackException
};
