import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SensorChart({ data }) {
  // Format data for recharts
  const chartData = data.map(point => ({
    time: new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Temperature: point.temperature,
    Humidity: point.humidity,
    Weight: point.weight,
  }));

  return (
    <div className="space-y-6">
      {/* Temperature Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Temperature (°C)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={[28, 42]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="Temperature" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Humidity Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Humidity (%)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={[40, 90]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weight Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Hive Weight (kg)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis domain={[40, 55]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="Weight" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
