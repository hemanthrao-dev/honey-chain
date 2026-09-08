// Mock IoT sensor data generators and AI prediction models

// Generate realistic sensor time series data
export function generateSensorData(days = 7, hiveId = 'HIVE001') {
  const data = [];
  const now = Date.now();
  const pointsPerDay = 24; // Hourly readings

  for (let i = days * pointsPerDay; i >= 0; i--) {
    const timestamp = now - (i * 60 * 60 * 1000); // Go back hour by hour

    // Simulate daily temperature cycle (cooler at night)
    const hourOfDay = new Date(timestamp).getHours();
    const tempBase = 34 + Math.sin((hourOfDay - 6) / 24 * Math.PI * 2) * 3;
    const tempNoise = (Math.random() - 0.5) * 1.5;

    // Humidity inversely correlates with temperature
    const humidityBase = 65 - Math.sin((hourOfDay - 6) / 24 * Math.PI * 2) * 10;
    const humidityNoise = (Math.random() - 0.5) * 5;

    // Weight gradually increases (honey accumulation) with small fluctuations
    const weightBase = 45 + (days * pointsPerDay - i) * 0.02;
    const weightNoise = (Math.random() - 0.5) * 0.3;

    data.push({
      timestamp,
      temperature: Math.round((tempBase + tempNoise) * 10) / 10,
      humidity: Math.round((humidityBase + humidityNoise) * 10) / 10,
      weight: Math.round((weightBase + weightNoise) * 10) / 10,
      hiveId,
    });
  }

  return data;
}

// Generate anomalous data (for alert testing)
export function generateAnomalousSensorData(anomalyType = 'swarming') {
  const baseData = generateSensorData(1);

  return baseData.map((point, idx) => {
    if (anomalyType === 'swarming' && idx > baseData.length - 5) {
      // Sudden weight drop indicates swarming
      return { ...point, weight: point.weight - 8 };
    }
    if (anomalyType === 'disease' && idx > baseData.length - 10) {
      // Temperature drop + high humidity = disease risk
      return {
        ...point,
        temperature: point.temperature - 4,
        humidity: point.humidity + 15
      };
    }
    if (anomalyType === 'overheating') {
      // High temperature = stress
      return { ...point, temperature: point.temperature + 5 };
    }
    return point;
  });
}

// Threshold-based alert detection
export function detectAlerts(sensorData) {
  const alerts = [];
  const latest = sensorData[sensorData.length - 1];
  const recent = sensorData.slice(-24); // Last 24 readings

  // Temperature alerts
  if (latest.temperature < 30) {
    alerts.push({
      type: 'warning',
      category: 'temperature',
      message: 'Hive temperature below optimal range',
      recommendation: 'Check for ventilation issues or queen problems',
      severity: 'medium',
    });
  }
  if (latest.temperature > 38) {
    alerts.push({
      type: 'danger',
      category: 'temperature',
      message: 'Hive overheating detected',
      recommendation: 'Provide shade and ensure adequate ventilation',
      severity: 'high',
    });
  }

  // Humidity alerts
  if (latest.humidity > 80) {
    alerts.push({
      type: 'warning',
      category: 'humidity',
      message: 'High humidity detected — disease risk',
      recommendation: 'Improve ventilation to prevent mold and disease',
      severity: 'medium',
    });
  }

  // Weight alerts (swarming detection)
  const avgWeight = recent.reduce((sum, r) => sum + r.weight, 0) / recent.length;
  const weightDrop = avgWeight - latest.weight;

  if (weightDrop > 5) {
    alerts.push({
      type: 'danger',
      category: 'swarming',
      message: 'Possible swarming detected (sudden weight loss)',
      recommendation: 'Inspect hive immediately for swarm cells',
      severity: 'high',
    });
  }

  // Disease prediction (combined factors)
  if (latest.temperature < 32 && latest.humidity > 75) {
    alerts.push({
      type: 'danger',
      category: 'disease',
      message: 'AI Alert: High disease risk (low temp + high humidity)',
      recommendation: 'Conduct health inspection and consider treatment',
      severity: 'high',
    });
  }

  return alerts;
}

// Simple yield prediction model (rule-based)
export function predictYield(sensorData) {
  const recent = sensorData.slice(-72); // Last 3 days

  const avgTemp = recent.reduce((sum, r) => sum + r.temperature, 0) / recent.length;
  const avgHumidity = recent.reduce((sum, r) => sum + r.humidity, 0) / recent.length;
  const weightGain = sensorData[sensorData.length - 1].weight - sensorData[0].weight;

  // Optimal conditions boost yield
  let yieldScore = 50; // Base score

  if (avgTemp >= 33 && avgTemp <= 36) yieldScore += 20;
  if (avgHumidity >= 50 && avgHumidity <= 70) yieldScore += 15;
  if (weightGain > 5) yieldScore += 15;

  // Estimate kg per harvest cycle
  const estimatedYield = Math.max(0, (yieldScore / 100) * 25 + weightGain * 0.4);

  return {
    estimatedYield: Math.round(estimatedYield * 10) / 10,
    confidence: yieldScore > 70 ? 'high' : yieldScore > 50 ? 'medium' : 'low',
    optimalityScore: yieldScore,
    factors: {
      temperature: avgTemp >= 33 && avgTemp <= 36 ? 'optimal' : 'suboptimal',
      humidity: avgHumidity >= 50 && avgHumidity <= 70 ? 'optimal' : 'suboptimal',
      weightTrend: weightGain > 5 ? 'positive' : weightGain > 0 ? 'stable' : 'declining',
    },
    nextHarvestEstimate: `${Math.ceil(25 / (estimatedYield || 1))} days`,
  };
}

// Mock beekeeper profiles — starts empty, admin adds their own
export const mockBeekeepers = [];

// Floral sources
export const floralSources = [
  'Multiflora (Mixed)',
  'Mustard',
  'Eucalyptus',
  'Sunflower',
  'Jamun',
  'Litchi',
  'Acacia',
  'Karanj',
  'Wild Forest',
];
