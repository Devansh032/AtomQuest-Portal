interface WeightageBarProps {
  total: number;
}

export default function WeightageBar({ total }: WeightageBarProps) {
  const isValid = total === 100;
  const isOver = total > 100;
  const pct = Math.min(total, 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isValid ? 'bg-green-500' : isOver ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-sm font-semibold w-16 text-right ${
          isValid ? 'text-green-700' : isOver ? 'text-red-600' : 'text-blue-600'
        }`}
      >
        {total}% / 100%
      </span>
      {!isValid && (
        <span className="text-xs text-red-500 font-medium">
          {isOver ? `Over by ${total - 100}%` : `Remaining: ${100 - total}%`}
        </span>
      )}
    </div>
  );
}
