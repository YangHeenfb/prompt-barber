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
  const hairGradientId = `hairShade-${size}`;
  const sideGradientId = `sideShade-${size}`;
  const highlightGradientId = `hairHighlight-${size}`;
  const capeGradientId = `capeShade-${size}`;

  const topRise = clamp(34 + state.topLength * 2.8 + state.volume * 2.7, 42, 82);
  const capTop = 118 - topRise;
  const capLeft = clamp(80 - state.sideLength * 1.05 - state.volume * 0.45, 66, 82);
  const capRight = 260 - capLeft;
  const crownPuff = clamp(8 + state.volume * 1.85, 12, 28);
  const sideWidth = clamp(11 + state.sideLength * 1.65 - state.fadeHeight * 1.7, 7, 25);
  const sideEnd = clamp(130 + state.sideLength * 7 - state.fadeHeight * 5.6, 138, 190);
  const cheekCut = clamp(2 + state.fadeHeight * 3.8, 2, 17);
  const sideburnEnd = clamp(146 + state.sideburns * 6.5, 152, 208);
  const sideburnWidth = clamp(5 + state.sideburns * 1.05, 7, 17);
  const bangsBottom = clamp(96 + state.bangsLength * 5.2 - state.volume * 0.45, 106, 145);
  const bangsLift = clamp(5 - state.volume * 1.2, -6, 5);
  const textureCount = Math.round(clamp(1 + state.texture * 0.55, 1, 7));
  const fadeBands = Math.max(0, Math.round(state.fadeHeight));
  const flyawayCount = Math.round(clamp((state.texture + state.volume + state.topLength - 16) / 2.6, 0, 3));
  const hasParting = state.parting !== "none";
  const partX = state.parting === "left" ? 106 : state.parting === "right" ? 154 : 130;
  const necklineY = state.neckline === "clean" ? 229 : state.neckline === "tapered" ? 237 : 233;

  const hairCapPath = [
    `M ${capLeft} 118`,
    `C ${capLeft - 1} ${91 - state.volume * 0.9}, ${94 - crownPuff * 0.55} ${capTop + 2}, 130 ${capTop}`,
    `C ${166 + crownPuff * 0.55} ${capTop + 2}, ${capRight + 1} ${91 - state.volume * 0.9}, ${capRight} 118`,
    `C ${167 + state.bangsLength * 0.7} ${104 + bangsLift}, 150 ${101 + bangsLift * 0.35}, 130 ${104 + bangsLift * 0.25}`,
    `C 110 ${101 + bangsLift * 0.35}, ${93 - state.bangsLength * 0.7} ${104 + bangsLift}, ${capLeft} 118`,
    "Z"
  ].join(" ");

  const leftSidePath = [
    `M ${capLeft + 9} 108`,
    `C ${82 - sideWidth} 122, ${77 - sideWidth * 0.45} 145, ${80 + cheekCut * 0.1} ${sideEnd}`,
    `C ${81 + cheekCut} ${sideEnd + 9}, ${94 + sideWidth * 0.18} ${sideEnd + 6}, ${100 + cheekCut * 0.22} ${sideEnd - 6}`,
    `C ${98 - sideWidth * 0.08} 150, 99 126, 108 111`,
    `C 101 107, 91 105, ${capLeft + 9} 108`,
    "Z"
  ].join(" ");

  const rightSidePath = [
    `M ${capRight - 9} 108`,
    `C ${178 + sideWidth} 122, ${183 + sideWidth * 0.45} 145, ${180 - cheekCut * 0.1} ${sideEnd}`,
    `C ${179 - cheekCut} ${sideEnd + 9}, ${166 - sideWidth * 0.18} ${sideEnd + 6}, ${160 - cheekCut * 0.22} ${sideEnd - 6}`,
    `C ${162 + sideWidth * 0.08} 150, 161 126, 152 111`,
    `C 159 107, 169 105, ${capRight - 9} 108`,
    "Z"
  ].join(" ");

  const leftSideburnPath = [
    `M ${93 - sideburnWidth * 0.28} 143`,
    `C ${85 - sideburnWidth * 0.28} 160, ${85 - sideburnWidth * 0.1} ${sideburnEnd - 8}, 90 ${sideburnEnd}`,
    `C ${96 + sideburnWidth * 0.18} ${sideburnEnd - 1}, ${100 + sideburnWidth * 0.08} 162, 99 145`,
    "Z"
  ].join(" ");

  const rightSideburnPath = [
    `M ${167 + sideburnWidth * 0.28} 143`,
    `C ${175 + sideburnWidth * 0.28} 160, ${175 + sideburnWidth * 0.1} ${sideburnEnd - 8}, 170 ${sideburnEnd}`,
    `C ${164 - sideburnWidth * 0.18} ${sideburnEnd - 1}, ${160 - sideburnWidth * 0.08} 162, 161 145`,
    "Z"
  ].join(" ");

  const textureStrokes = Array.from({ length: textureCount }).map((_, index) => {
    const x = 92 + index * (76 / Math.max(1, textureCount - 1));
    const y = capTop + 19 + Math.sin(index * 1.55) * 5;
    const pull = index % 2 === 0 ? 9 : -9;
    return (
      <path
        key={index}
        d={`M ${x} ${y} C ${x + pull} ${y + 9}, ${x - pull * 0.2} ${y + 21}, ${x + pull * 0.15} ${y + 31}`}
        className="hairTexture"
      />
    );
  });

  const bangCutCount = Math.round(clamp(2 + state.texture * 0.35 + state.bangsLength * 0.14, 2, 6));
  const bangCuts = Array.from({ length: bangCutCount }).map((_, index) => {
    const x = 97 + index * (66 / Math.max(1, bangCutCount - 1));
    const y = 109 + Math.sin(index * 1.4) * 2;
    const endY = bangsBottom - 5 + Math.sin(index * 1.9) * 4;
    const pull = index % 2 === 0 ? -5 : 5;
    return <path key={index} d={`M ${x} ${y} C ${x + pull} ${y + 8}, ${x - pull * 0.3} ${endY - 8}, ${x + pull * 0.15} ${endY}`} className="bangCut" />;
  });

  const flyaways = Array.from({ length: flyawayCount }).map((_, index) => {
    const x = 104 + index * 18;
    const y = capTop + 7 + Math.sin(index) * 3;
    const direction = index % 2 === 0 ? -1 : 1;
    return <path key={index} d={`M ${x} ${y} C ${x + direction * 4} ${y - 12}, ${x + direction * 13} ${y - 12}, ${x + direction * 17} ${y - 3}`} className="flyawayHair" />;
  });

  const fadeShapes = Array.from({ length: fadeBands }).map((_, index) => {
    const y = 130 + index * 13;
    const opacity = 0.24 + index * 0.08;
    return (
      <g key={index} opacity={opacity}>
        <path d={`M ${90 - index * 1.4} ${y} C ${82 - index * 1.2} ${y + 8}, ${82 - index * 1.2} ${y + 18}, ${90 + index * 0.5} ${y + 27}`} className="fadeBand" />
        <path d={`M ${170 + index * 1.4} ${y} C ${178 + index * 1.2} ${y + 8}, ${178 + index * 1.2} ${y + 18}, ${170 - index * 0.5} ${y + 27}`} className="fadeBand" />
      </g>
    );
  });

  const bangsPath = [
    "M 81 104",
    `C 96 ${95 + bangsLift}, 112 ${97 + bangsLift}, 130 ${101 + bangsLift * 0.4}`,
    `C 148 ${97 + bangsLift}, 164 ${95 + bangsLift}, 179 104`,
    `C 174 ${bangsBottom - 7}, 160 ${bangsBottom + 2}, 145 ${bangsBottom - 2}`,
    `C 130 ${bangsBottom + 8}, 111 ${bangsBottom - 1}, 94 ${bangsBottom + 4}`,
    `C 88 ${bangsBottom - 5}, 84 ${bangsBottom - 1}, 81 104`,
    "Z"
  ].join(" ");

  const partedBangLeft = [
    "M 82 105",
    `C 98 ${90 + bangsLift}, ${partX - 10} ${96 + bangsLift}, ${partX - 2} ${102 + bangsLift}`,
    `C ${partX - 11} ${bangsBottom + 1}, ${partX - 30} ${bangsBottom + 8}, 92 ${bangsBottom}`,
    `C 87 ${bangsBottom - 7}, 84 ${bangsBottom - 1}, 82 105`,
    "Z"
  ].join(" ");

  const partedBangRight = [
    `M ${partX + 2} ${102 + bangsLift}`,
    `C ${partX + 15} ${96 + bangsLift}, 162 ${90 + bangsLift}, 178 105`,
    `C 176 ${bangsBottom - 1}, 170 ${bangsBottom - 7}, 158 ${bangsBottom}`,
    `C ${partX + 32} ${bangsBottom + 8}, ${partX + 11} ${bangsBottom + 1}, ${partX + 2} ${102 + bangsLift}`,
    "Z"
  ].join(" ");

  const necklinePath = state.neckline === "tapered"
    ? `M 111 ${necklineY} C 119 ${necklineY + 9}, 141 ${necklineY + 9}, 149 ${necklineY}`
    : state.neckline === "clean"
      ? `M 112 ${necklineY} L 148 ${necklineY}`
      : `M 111 ${necklineY} C 119 ${necklineY + 4}, 125 ${necklineY - 3}, 132 ${necklineY + 2} C 139 ${necklineY + 6}, 144 ${necklineY - 2}, 149 ${necklineY}`;

  return (
    <div className={`hairRenderer ${size === "small" ? "hairRendererSmall" : ""}`} aria-label={label ?? "hair renderer"}>
      {label ? <div className="rendererLabel">{label}</div> : null}
      <svg viewBox="0 0 260 320" width={width} height={height} role="img">
        <title>{label ?? "发型渲染"}</title>
        <defs>
          <linearGradient id={hairGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4a3125" />
            <stop offset="56%" stopColor="#2f211b" />
            <stop offset="100%" stopColor="#1d1410" />
          </linearGradient>
          <linearGradient id={sideGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3a271f" />
            <stop offset="100%" stopColor="#211610" />
          </linearGradient>
          <linearGradient id={capeGradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f4ead9" />
            <stop offset="100%" stopColor="#d9c5aa" />
          </linearGradient>
          <linearGradient id={highlightGradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7a5037" />
            <stop offset="100%" stopColor="#4a2f22" />
          </linearGradient>
        </defs>

        <ellipse cx="130" cy="292" rx="82" ry="17" className="portraitShadow" />
        <path d="M 98 287 C 101 256, 113 242, 130 242 C 147 242, 159 256, 162 287 Z" className="shirtBack" fill={`url(#${capeGradientId})`} />
        <path d="M 113 219 C 115 244, 106 254, 97 272 L 163 272 C 154 254, 145 244, 147 219 Z" className="neck" />
        <path d="M 67 291 C 78 260, 102 250, 130 250 C 158 250, 182 260, 193 291 Z" className="shoulders" fill={`url(#${capeGradientId})`} />
        <path d="M 82 127 C 80 103, 87 82, 102 68 C 118 54, 142 54, 158 68 C 173 82, 180 103, 178 127 L 174 169 C 171 150, 164 128, 150 113 L 110 113 C 96 128, 89 150, 86 169 Z" className="backHair" />
        <ellipse cx="75" cy="158" rx="12" ry="20" className="ear" />
        <ellipse cx="185" cy="158" rx="12" ry="20" className="ear" />
        <path d="M 83 119 C 83 84, 102 62, 130 62 C 158 62, 177 84, 177 119 L 179 166 C 180 211, 159 238, 130 238 C 101 238, 80 211, 81 166 Z" className="face" />
        <path d="M 94 122 C 96 88, 111 70, 130 70 C 149 70, 164 88, 166 122" className="faceWarmth" />
        <path d="M 99 219 C 110 232, 150 232, 161 219 C 154 240, 106 240, 99 219 Z" className="jawShade" />

        <path
          d={leftSidePath}
          className="hairSide"
          fill={`url(#${sideGradientId})`}
        />
        <path
          d={rightSidePath}
          className="hairSide"
          fill={`url(#${sideGradientId})`}
        />
        <path d={leftSideburnPath} className="hairSide sideburnHair" fill={`url(#${sideGradientId})`} />
        <path d={rightSideburnPath} className="hairSide sideburnHair" fill={`url(#${sideGradientId})`} />
        {fadeShapes}

        <path
          d={hairCapPath}
          className="hairCap"
          fill={`url(#${hairGradientId})`}
        />
        <path
          d={`M ${capLeft + 20} ${capTop + 19} C 108 ${capTop + 6}, 141 ${capTop + 6}, ${capRight - 20} ${capTop + 22}`}
          className="hairHighlight"
          stroke={`url(#${highlightGradientId})`}
        />
        {flyaways}
        {hasParting ? (
          <g className="bangsLayer">
            <path d={partedBangLeft} />
            <path d={partedBangRight} />
          </g>
        ) : (
          <path d={bangsPath} className="bangsShape" />
        )}
        <path d={necklinePath} className="neckline" />
        {hasParting ? <path d={`M ${partX} ${capTop + 8} C ${partX - 3} ${capTop + 35}, ${partX + 2} 98, ${partX} ${bangsBottom - 12}`} className="partingLine" /> : null}
        {textureStrokes}
        {bangCuts}

        <ellipse cx="109" cy="160" rx="6.4" ry="7.3" className="eye" />
        <ellipse cx="151" cy="160" rx="6.4" ry="7.3" className="eye" />
        <circle cx="111.5" cy="157.8" r="1.9" className="eyeLight" />
        <circle cx="153.5" cy="157.8" r="1.9" className="eyeLight" />
        <path d="M 130 168 C 126 179, 127 186, 136 186" className="nose" />
        <path d="M 113 203 C 123 211, 140 211, 151 203" className="mouth" />
        <path d="M 93 146 C 103 139, 115 139, 123 145" className="brow" />
        <path d="M 137 145 C 145 139, 157 139, 168 146" className="brow" />
      </svg>
    </div>
  );
}
