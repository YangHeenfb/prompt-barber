import type { HairState } from "@/lib/hair/types";

type HairRendererProps = {
  state: HairState;
  size?: "small" | "large";
  label?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function HairRenderer({ state, size = "large", label }: HairRendererProps) {
  const width = size === "small" ? 220 : 260;
  const height = size === "small" ? 270 : 320;
  const scale = size === "small" ? 0.85 : 1;

  const topRise = clamp(state.volume * 4 + state.topLength * 2.2, 10, 65);
  const capTop = 102 - topRise;
  const sideSpread = clamp(10 + state.sideLength * 1.7, 12, 28);
  const sideEnd = clamp(134 + state.sideLength * 6, 144, 190);
  const sideburnEnd = clamp(148 + state.sideburns * 7, 158, 194);
  const sideburnWidth = clamp(5 + state.sideburns * 0.9, 7, 13);
  const bangsBottom = clamp(95 + state.bangsLength * 4.2 - state.volume * 0.6, 98, 133);
  const bangsStroke = clamp(5 + state.bangsLength * 0.55, 7, 10.5);
  const textureCount = Math.max(2, Math.round(state.texture));
  const fadeBands = Math.max(0, Math.round(state.fadeHeight));
  const volumeLift = state.volume > 6 ? -8 : state.volume < 3 ? 8 : 0;
  const hasParting = state.parting !== "none";
  const partX = state.parting === "left" ? 108 : state.parting === "right" ? 152 : 130;
  const necklineY = state.neckline === "clean" ? 241 : state.neckline === "tapered" ? 249 : 245;

  const textureStrokes = Array.from({ length: textureCount }).map((_, index) => {
    const x = 82 + index * (96 / Math.max(1, textureCount - 1));
    const y = capTop + 28 + Math.sin(index) * 6;
    return <path key={index} d={`M ${x} ${y} C ${x + 8} ${y + 14}, ${x - 8} ${y + 25}, ${x + 4} ${y + 40}`} className="hairTexture" />;
  });

  const fadeShapes = Array.from({ length: fadeBands }).map((_, index) => {
    const y = 132 + index * 14;
    const opacity = 0.18 + index * 0.08;
    return (
      <g key={index} opacity={opacity}>
        <path d={`M ${78 - index * 2} ${y} Q ${70 - index} ${y + 11} ${78} ${y + 23}`} className="fadeBand" />
        <path d={`M ${182 + index * 2} ${y} Q ${190 + index} ${y + 11} ${182} ${y + 23}`} className="fadeBand" />
      </g>
    );
  });

  const bangsPath = hasParting
    ? `M 82 96 C ${partX - 38} ${90 + volumeLift}, ${partX - 15} ${bangsBottom}, ${partX - 5} ${bangsBottom - 5} M ${partX + 5} ${bangsBottom - 5} C ${partX + 17} ${bangsBottom}, 166 ${92 + volumeLift}, 178 96`
    : `M 82 97 C 96 ${bangsBottom}, 115 ${bangsBottom + 3}, 130 ${bangsBottom - 2} C 146 ${bangsBottom + 3}, 164 ${bangsBottom}, 178 97`;

  const necklinePath = state.neckline === "tapered"
    ? `M 112 ${necklineY} C 120 ${necklineY + 8}, 140 ${necklineY + 8}, 148 ${necklineY}`
    : state.neckline === "clean"
      ? `M 112 ${necklineY} L 148 ${necklineY}`
      : `M 111 ${necklineY} C 119 ${necklineY + 4}, 125 ${necklineY - 2}, 132 ${necklineY + 2} C 139 ${necklineY + 5}, 144 ${necklineY - 1}, 149 ${necklineY}`;

  return (
    <div className={`hairRenderer ${size === "small" ? "hairRendererSmall" : ""}`} aria-label={label ?? "hair renderer"}>
      {label ? <div className="rendererLabel">{label}</div> : null}
      <svg viewBox="0 0 260 320" width={width} height={height} role="img">
        <defs>
          <linearGradient id={`hairShade-${size}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.94" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.74" />
          </linearGradient>
        </defs>

        <ellipse cx="130" cy="292" rx="82" ry="20" className="shadow" />
        <path d="M 111 226 C 111 253, 103 258, 92 274 L 168 274 C 157 258, 149 253, 149 226 Z" className="neck" />
        <path d="M 68 291 C 82 254, 105 259, 130 259 C 155 259, 178 254, 192 291 Z" className="shoulders" />
        <ellipse cx="70" cy="160" rx="15" ry="23" className="ear" />
        <ellipse cx="190" cy="160" rx="15" ry="23" className="ear" />
        <path d="M 78 105 C 82 71, 105 55, 130 55 C 155 55, 178 71, 182 105 L 184 166 C 184 214, 161 239, 130 239 C 99 239, 76 214, 76 166 Z" className="face" />

        <path
          d={`M ${92 - sideSpread * 0.35} 104 C ${76 - state.fadeHeight * 2} 116, ${72 - state.fadeHeight} 144, 76 ${sideEnd - 10} C 78 ${sideEnd + 4}, 91 ${sideEnd + 7}, 99 ${sideEnd - 3} C ${95 + sideSpread * 0.12} 154, ${96 + sideSpread * 0.08} 126, 102 110 C 99 107, 96 105, ${92 - sideSpread * 0.35} 104 Z`}
          className="hairSide"
        />
        <path
          d={`M ${168 + sideSpread * 0.35} 104 C ${184 + state.fadeHeight * 2} 116, ${188 + state.fadeHeight} 144, 184 ${sideEnd - 10} C 182 ${sideEnd + 4}, 169 ${sideEnd + 7}, 161 ${sideEnd - 3} C ${165 - sideSpread * 0.12} 154, ${164 - sideSpread * 0.08} 126, 158 110 C 161 107, 164 105, ${168 + sideSpread * 0.35} 104 Z`}
          className="hairSide"
        />
        <path
          d={`M 85 144 C ${80 - sideburnWidth * 0.2} 158, ${80 - sideburnWidth * 0.25} ${sideburnEnd - 8}, 86 ${sideburnEnd + 2} C ${92 + sideburnWidth * 0.25} ${sideburnEnd + 1}, ${96 + sideburnWidth * 0.18} 160, 95 145 Z`}
          className="hairSide sideburnHair"
        />
        <path
          d={`M 175 144 C ${180 + sideburnWidth * 0.2} 158, ${180 + sideburnWidth * 0.25} ${sideburnEnd - 8}, 174 ${sideburnEnd + 2} C ${168 - sideburnWidth * 0.25} ${sideburnEnd + 1}, ${164 - sideburnWidth * 0.18} 160, 165 145 Z`}
          className="hairSide sideburnHair"
        />
        {fadeShapes}

        <path
          d={`M 74 114 C 74 ${72 + volumeLift}, 94 ${capTop}, 130 ${capTop} C 166 ${capTop}, 186 ${72 + volumeLift}, 186 114 C 170 ${98}, 146 ${96}, 130 ${98} C 112 ${95}, 92 ${98}, 74 114 Z`}
          className="hairCap"
          fill={`url(#hairShade-${size})`}
        />
        <path d={bangsPath} className="bangs" style={{ strokeWidth: bangsStroke }} />
        <path d={necklinePath} className="neckline" />
        {hasParting ? <path d={`M ${partX} ${capTop + 7} C ${partX - 2} ${capTop + 35}, ${partX + 2} 95, ${partX} ${bangsBottom - 10}`} className="partingLine" /> : null}
        {textureStrokes}

        <ellipse cx="111" cy="159" rx="4" ry="5" className="eye" />
        <ellipse cx="149" cy="159" rx="4" ry="5" className="eye" />
        <path d="M 129 165 C 125 178, 125 185, 135 186" className="nose" />
        <path d="M 112 203 C 123 211, 141 211, 152 203" className="mouth" />
        <path d="M 92 146 C 103 139, 113 139, 121 145" className="brow" />
        <path d="M 139 145 C 148 139, 158 139, 170 146" className="brow" />
      </svg>
      <span className="srOnly">缩放比例 {scale}</span>
    </div>
  );
}
