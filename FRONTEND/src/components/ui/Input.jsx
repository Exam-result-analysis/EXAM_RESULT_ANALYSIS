const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2
        text-sm text-slate-700 outline-none transition
        placeholder:text-slate-400
        focus:border-blue-500 focus:ring-2 focus:ring-blue-100
        ${className}`}
      {...props}
    />
  );
};

export default Input;