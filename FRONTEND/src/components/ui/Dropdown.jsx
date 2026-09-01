const Dropdown = ({
  label,
  value,
  options = [],
  onChange,
  className = "",
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-slate-600">
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5
          text-sm text-slate-700 outline-none focus:border-blue-500
          focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Dropdown;