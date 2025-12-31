import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { SUBSCRIPTION_CATEGORIES, CURRENCIES } from "../types";
import type { CategoryAnalytics } from "../types";

interface SpendingBreakdownChartProps {
  data: CategoryAnalytics[];
  currency?: string;
}

// Chart colors that work well with the design system
const CHART_COLORS = [
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#6366f1", // indigo
  "#f97316", // orange
  "#14b8a6", // teal
  "#84cc16", // lime
  "#a855f7", // purple
  "#ef4444", // red
];

export const SpendingBreakdownChart = ({
  data,
  currency = "USD",
}: SpendingBreakdownChartProps) => {
  const getCurrencySymbol = (curr: string) => {
    const found = CURRENCIES.find(c => c.value === curr);
    return found?.symbol ?? curr;
  };

  const getCategoryLabel = (cat: string) => {
    const found = SUBSCRIPTION_CATEGORIES.find(c => c.value === cat);
    return found?.label.replace(/^[^\s]+\s/, '') ?? cat; // Remove emoji from label
  };

  const currencySymbol = getCurrencySymbol(currency);
  const totalSpending = data.reduce((sum, item) => sum + item.monthly_equivalent, 0);

  // Transform data for the pie chart
  const chartData = data.map((item, index) => ({
    name: getCategoryLabel(item.category),
    value: item.monthly_equivalent,
    count: item.subscription_count,
    color: CHART_COLORS[index % CHART_COLORS.length],
    percentage: totalSpending > 0 
      ? ((item.monthly_equivalent / totalSpending) * 100).toFixed(1)
      : '0',
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{data.name}</p>
          <p className="text-lg font-bold text-primary">
            {currencySymbol}{data.value.toFixed(2)}/mo
          </p>
          <p className="text-xs text-muted-foreground">
            {data.count} subscription{data.count !== 1 ? 's' : ''} • {data.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
    if (!payload) return null;
    
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold text-sm mb-4">Spending by Category</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No data to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-semibold text-sm mb-4">Spending by Category</h3>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  strokeWidth={0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary below chart */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Monthly</span>
          <span className="text-lg font-bold">
            {currencySymbol}{totalSpending.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
