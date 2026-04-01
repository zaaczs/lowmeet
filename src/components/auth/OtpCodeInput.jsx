import { useEffect, useMemo, useRef } from "react";

function OtpCodeInput({ value, onChange, length = 6 }) {
  const refs = useRef([]);
  const chars = useMemo(() => {
    const base = (value || "").slice(0, length).split("");
    while (base.length < length) base.push("");
    return base;
  }, [value, length]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  const updateAt = (index, digit) => {
    const next = [...chars];
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    updateAt(index, digit);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, length - 1);
    refs.current[nextIndex]?.focus();
    event.preventDefault();
  };

  return (
    <div className="flex items-center gap-2" onPaste={handlePaste}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          value={char}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          inputMode="numeric"
          maxLength={1}
          className="h-12 w-11 rounded-lg border border-input bg-white text-center text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Dígito ${index + 1} do código`}
        />
      ))}
    </div>
  );
}

export default OtpCodeInput;
