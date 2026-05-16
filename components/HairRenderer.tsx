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
  const capeGradientId = `capeShade-${size}`;

  const topRise = clamp(32 + state.topLength * 2.5 + state.volume * 2.8, 40, 78);
  const capTop = 116 - topRise;
  const capLeft = clamp(80 - state.sideLength * 0.9 - state.volume * 0.25, 68, 82);
  const capRight = 260 - capLeft;
  const crownTension = clamp(state.volume * 1.1 - state.texture * 0.25, 0, 9);
  const sideThickness = clamp(7 + state.sideLength * 1.35 - state.fadeHeight * 1.25, 7, 21);
  const sideEnd = clamp(132 + state.sideLength * 6.5 - state.fadeHeight * 4.8, 140, 188);
  const sideburnEnd = clamp(148 + state.sideburns * 6.2, 156, 204);
  const sideburnWidth = clamp(5 + state.sideburns * 0.95, 7, 15);
  const bangsBottom = clamp(96 + state.bangsLength * 5.1 - state.volume * 0.35, 108, 142);
  const bangsLift = state.volume > 6 ? -5 : state.volume < 3 ? 4 : 0;
  const textureCount = Math.max(3, Math.round(3 + state.texture * 0.9));
  const fadeBands = Math.max(0, Math.round(state.fadeHeight));
  const flyawayCount = Math.round(clamp((state.topLength + state.volume - 10) / 1.5, 0, 4));
  const hasParting = state.parting !== "none";
  const partX = state.parting === "left" ? 108 : state.parting === "right" ? 152 : 130;
  const necklineY = state.neckline === "clean" ? 231 : state.neckline === "tapered" ? 238 : 234;

  const hairCapPath = [
    `M ${capLeft} 114`,
    `C ${capLeft + 2} ${84 - crownTension}, ${95 - state.volume * 0.45} ${capTop}, 130 ${capTop}`,
    `C ${165 + state.volume * 0.45} ${capTop}, ${capRight - 2} ${84 - crownTension}, ${capRight} 114`,
    `C 170 ${101 + bangsLift}, 148 ${101 + bangsLift * 0.3}, 130 ${103 + bangsLift * 0.25}`,
    `C 112 ${101 + bangsLift * 0.3}, 90 ${101 + bangsLift}, ${capLeft} 114`,
    "Z"
  ].join(" ");

  const leftSidePath = [
    `M ${capLeft + 10} 105`,
    `C ${79 - sideThickness} 116, ${74 - sideThickness * 0.45} 141, ${77 - state.fadeHeight * 0.8} ${sideEnd}`,
    `C 78 ${sideEnd + 11}, ${91 + sideThickness * 0.1} ${sideEnd + 8}, ${99} ${sideEnd - 5}`,
    `C ${96 - sideThickness * 0.08} 149, 98 124, 107 110`,
    `C 99 106, 89 103, ${capLeft + 10} 105`,
    "Z"
  ].join(" ");

  const rightSidePath = [
    `M ${capRight - 10} 105`,
    `C ${181 + sideThickness} 116, ${186 + sideThickness * 0.45} 141, ${183 + state.fadeHeight * 0.8} ${sideEnd}`,
    `C 182 ${sideEnd + 11}, ${169 - sideThickness * 0.1} ${sideEnd + 8}, ${161} ${sideEnd - 5}`,
    `C ${164 + sideThickness * 0.08} 149, 162 124, 153 110`,
    `C 161 106, 171 103, ${capRight - 10} 105`,
    "Z"
  ].join(" ");

  const leftSideburnPath = [
    `M ${91 - sideburnWidth * 0.22} 145`,
    `C ${84 - sideburnWidth * 0.35} 160, ${83 - sideburnWidth * 0.18} ${sideburnEnd - 8}, 88 ${sideburnEnd}`,
    `C ${94 + sideburnWidth * 0.2} ${sideburnEnd - 1}, ${99 + sideburnWidth * 0.12} 163, 98 146`,
    "Z"
  ].join(" ");

  const rightSideburnPath = [
    `M ${169 + sideburnWidth * 0.22} 145`,
    `C ${176 + sideburnWidth * 0.35} 160, ${177 + sideburnWidth * 0.18} ${sideburnEnd - 8}, 172 ${sideburnEnd}`,
    `C ${166 - sideburnWidth * 0.2} ${sideburnEnd - 1}, ${161 - sideburnWidth * 0.12} 163, 162 146`,
    "Z"
  ].join(" ");

  const textureStrokes = Array.from({ length: textureCount }).map((_, index) => {
    const x = 84 + index * (92 / Math.max(1, textureCount - 1));
    const y = capTop + 20 + Math.sin(index * 1.7) * 4;
    const pull = index % 2 === 0 ? 11 : -11;
    return (
      <path
        key={index}
        d={`M ${x} ${y} C ${x + pull} ${y + 10}, ${x - pull * 0.35} ${y + 23}, ${x + pull * 0.2} ${y + 35}`}
        className="hairTexture"
      />
    );
  });

  const bangCuts = Array.from({ length: Math.max(3, Math.round(state.texture / 2 + state.bangsLength / 2)) }).map((_, index, cuts) => {
    const x = 93 + index * (74 / Math.max(1, cuts.length - 1));
    const y = 104 + Math.sin(index * 1.4) * 3;
    const endY = bangsBottom - 2 + Math.sin(index * 2.1) * 4;
    const pull = index % 2 === 0 ? -6 : 6;
    return <path key={index} d={`M ${x} ${y} C ${x + pull} ${y + 9}, ${x - pull * 0.4} ${endY - 8}, ${x + pull * 0.18} ${endY}`} className="bangCut" />;
  });

  const flyaways = Array.from({ length: flyawayCount }).map((_, index) => {
    const x = 104 + index * 18;
    const y = capTop + 7 + Math.sin(index) * 3;
    const direction = index % 2 === 0 ? -1 : 1;
    return <path key={index} d={`M ${x} ${y} C ${x + direction * 4} ${y - 12}, ${x + direction * 13} ${y - 12}, ${x + direction * 17} ${y - 3}`} className="flyawayHair" />;
  });

  const fadeShapes = Array.from({ length: fadeBands }).map((_, index) => {
    const y = 132 + index * 12;
    const opacity = 0.2 + index * 0.07;
    return (
      <g key={index} opacity={opacity}>
        <path d={`M ${86 - index * 1.5} ${y} C ${78 - index} ${y + 8}, ${78 - index} ${y + 17}, ${87} ${y + 25}`} className="fadeBand" />
        <path d={`M ${174 + index * 1.5} ${y} C ${182 + index} ${y + 8}, ${182 + index} ${y + 17}, ${173} ${y + 25}`} className="fadeBand" />
      </g>
    );
  });

  const bangsPath = [
    "M 80 101",
    `C 94 ${93 + bangsLift}, 111 ${96 + bangsLift}, 130 ${99 + bangsLift * 0.4}`,
    `C 149 ${96 + bangsLift}, 166 ${93 + bangsLift}, 180 101`,
    `C 174 ${bangsBottom - 5}, 160 ${bangsBottom + 3}, 145 ${bangsBottom - 1}`,
    `C 131 ${bangsBottom + 7}, 111 ${bangsBottom}, 92 ${bangsBottom + 5}`,
    `C 87 ${bangsBottom - 4}, 83 ${bangsBottom - 1}, 80 101`,
    "Z"
  ].join(" ");

  const partedBangLeft = [
    "M 82 103",
    `C 97 ${88 + bangsLift}, ${partX - 10} ${96 + bangsLift}, ${partX - 2} ${101 + bangsLift}`,
    `C ${partX - 11} ${bangsBottom - 1}, ${partX - 30} ${bangsBottom + 6}, 91 ${bangsBottom}`,
    `C 87 ${bangsBottom - 7}, 84 ${bangsBottom - 1}, 82 103`,
    "Z"
  ].join(" ");

  const partedBangRight = [
    `M ${partX + 2} ${101 + bangsLift}`,
    `C ${partX + 15} ${96 + bangsLift}, 164 ${88 + bangsLift}, 178 103`,
    `C 176 ${bangsBottom - 1}, 169 ${bangsBottom - 6}, 157 ${bangsBottom}`,
    `C ${partX + 32} ${bangsBottom + 5}, ${partX + 11} ${bangsBottom - 1}, ${partX + 2} ${101 + bangsLift}`,
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
        </defs>

        <ellipse cx="130" cy="292" rx="83" ry="17" className="portraitShadow" />
        <path d="M 88 288 C 91 254, 108 242, 130 242 C 152 242, 169 254, 172 288 Z" className="shirtBack" fill={`url(#${capeGradientId})`} />
        <path d="M 111 222 C 113 248, 104 256, 95 275 L 165 275 C 156 256, 147 248, 149 222 Z" className="neck" />
        <path d="M 68 291 C 78 254, 101 250, 130 250 C 159 250, 182 254, 192 291 Z" className="shoulders" fill={`url(#${capeGradientId})`} />
        <path d="M 83 128 C 82 104, 88 82, 102 68 C 116 55, 144 55, 158 68 C 172 82, 178 104, 177 128 Z" className="backHair" />
        <ellipse cx="75" cy="158" rx="13" ry="21" className="ear" />
        <ellipse cx="185" cy="158" rx="13" ry="21" className="ear" />
        <path d="M 82 116 C 83 80, 103 60, 130 60 C 157 60, 177 80, 178 116 L 180 161 C 182 211, 160 239, 130 239 C 100 239, 78 211, 80 161 Z" className="face" />
        <path d="M 98 220 C 109 234, 151 234, 162 220 C 155 242, 105 242, 98 220 Z" className="jawShade" />

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
        {hasParting ? <path d={`M ${partX} ${capTop + 8} C ${partX - 3} ${capTop + 35}, ${partX + 2} 96, ${partX} ${bangsBottom - 12}`} className="partingLine" /> : null}
        {textureStrokes}
        {bangCuts}

        <ellipse cx="109" cy="160" rx="4.4" ry="5.3" className="eye" />
        <ellipse cx="151" cy="160" rx="4.4" ry="5.3" className="eye" />
        <circle cx="110.5" cy="158" r="1.2" className="eyeLight" />
        <circle cx="152.5" cy="158" r="1.2" className="eyeLight" />
        <path d="M 129 166 C 125 179, 126 186, 136 187" className="nose" />
        <path d="M 112 203 C 122 211, 141 211, 152 203" className="mouth" />
        <path d="M 93 146 C 103 140, 115 140, 122 146" className="brow" />
        <path d="M 138 146 C 146 140, 158 140, 169 146" className="brow" />
      </svg>
    </div>
  );
}
