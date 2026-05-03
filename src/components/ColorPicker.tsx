import { useState, useCallback, useRef, useEffect } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onClose?: () => void;
}

// Convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert RGB to HSV
const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, v };
};

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number) => {
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
};

export const ColorPicker = ({ value, onChange, onClose }: ColorPickerProps) => {
  const rgb = hexToRgb(value) || { r: 50, g: 63, b: 82 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);
  const [localRgb, setLocalRgb] = useState(rgb);

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  // Update from HSV changes
  const updateFromHsv = useCallback(
    (h: number, s: number, v: number) => {
      const rgb = hsvToRgb(h, s, v);
      setLocalRgb(rgb);
      onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
    },
    [onChange]
  );

  // Handle saturation/value box interaction
  const handleSvMouse = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!satValRef.current) return;
      const rect = satValRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setSat(x);
      setVal(1 - y);
      updateFromHsv(hue, x, 1 - y);
    },
    [hue, updateFromHsv]
  );

  // Handle hue slider interaction
  const handleHueMouse = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!hueRef.current) return;
      const rect = hueRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newHue = x * 360;
      setHue(newHue);
      updateFromHsv(newHue, sat, val);
    },
    [sat, val, updateFromHsv]
  );

  // Global mouse events for dragging
  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (dragging === "sv") handleSvMouse(e);
      else if (dragging === "hue") handleHueMouse(e);
    };
    const handleUp = () => setDragging(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, handleSvMouse, handleHueMouse]);

  // Update local state when prop changes
  useEffect(() => {
    const rgb = hexToRgb(value);
    if (rgb) {
      setLocalRgb(rgb);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      setHue(hsv.h);
      setSat(hsv.s);
      setVal(hsv.v);
    }
  }, [value]);

  const currentHex = rgbToHex(localRgb.r, localRgb.g, localRgb.b);
  const hueColor = rgbToHex(
    hsvToRgb(hue, 1, 1).r,
    hsvToRgb(hue, 1, 1).g,
    hsvToRgb(hue, 1, 1).b
  );

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 1000,
        background: "var(--af-surface)",
        border: "1px solid var(--af-border)",
        borderRadius: 8,
        padding: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        minWidth: 220,
      }}
    >
      {/* Saturation/Value Box */}
      <div
        ref={satValRef}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging("sv");
          handleSvMouse(e);
        }}
        style={{
          width: "100%",
          height: 150,
          background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hueColor})`,
          borderRadius: 4,
          cursor: "crosshair",
          position: "relative",
          marginBottom: 12,
        }}
      >
        {/* Selector circle */}
        <div
          style={{
            position: "absolute",
            left: `${sat * 100}%`,
            top: `${(1 - val) * 100}%`,
            width: 12,
            height: 12,
            border: "2px solid white",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 2px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Hue Slider */}
      <div
        ref={hueRef}
        onMouseDown={(e) => {
          e.preventDefault();
          setDragging("hue");
          handleHueMouse(e);
        }}
        style={{
          width: "100%",
          height: 12,
          background:
            "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
          borderRadius: 6,
          cursor: "pointer",
          position: "relative",
          marginBottom: 12,
        }}
      >
        {/* Hue selector */}
        <div
          style={{
            position: "absolute",
            left: `${(hue / 360) * 100}%`,
            top: "50%",
            width: 12,
            height: 12,
            background: "white",
            border: "2px solid var(--af-border)",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Color Preview and RGB Inputs */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: currentHex,
            borderRadius: 4,
            border: "1px solid var(--af-border)",
          }}
        />
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {["r", "g", "b"].map((c) => (
            <div key={c} style={{ flex: 1 }}>
              <input
                type="number"
                min={0}
                max={255}
                value={Math.round(localRgb[c as "r" | "g" | "b"])}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 0;
                  const newRgb = { ...localRgb, [c]: v };
                  setLocalRgb(newRgb);
                  onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
                }}
                style={{
                  width: "100%",
                  background: "var(--af-bg)",
                  border: "1px solid var(--af-border)",
                  borderRadius: 4,
                  padding: "4px 6px",
                  fontSize: 12,
                  color: "var(--af-fg)",
                  textAlign: "center",
                }}
              />
              <div
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: "var(--af-muted)",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                {c}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 20,
          height: 20,
          background: "transparent",
          border: "none",
          color: "var(--af-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          borderRadius: 4,
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--af-surface-2)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        ×
      </button>
    </div>
  );
};
