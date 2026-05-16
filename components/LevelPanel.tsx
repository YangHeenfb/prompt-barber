import { HairRenderer } from "./HairRenderer";
import type { LevelConfig } from "@/lib/hair/types";

type LevelPanelProps = {
  levels: LevelConfig[];
  currentIndex: number;
  onSelectLevel: (index: number) => void;
};

export function LevelPanel({ levels, currentIndex, onSelectLevel }: LevelPanelProps) {
  const level = levels[currentIndex];
  return (
    <section className="panel levelPanel">
      <div className="panelHeader">
        <p className="eyebrow">关卡</p>
        <h2>{level.name}</h2>
      </div>

      <div className="levelButtons" role="tablist" aria-label="选择关卡">
        {levels.map((item, index) => (
          <button
            key={item.id}
            className={index === currentIndex ? "levelButton active" : "levelButton"}
            onClick={() => onSelectLevel(index)}
            type="button"
          >
            {index + 1}. {item.name}
          </button>
        ))}
      </div>

      <div className="targetCard">
        <HairRenderer state={level.target} size="small" label="目标参考" />
        <div>
          <p className="eyebrow">目标</p>
          <h3>参考发型</h3>
          <p>{level.goal}</p>
        </div>
      </div>

      <div className="ruleBox">
        <div>
          <span className="metricLabel">通关准确度</span>
          <strong>{level.passAccuracyThreshold}%</strong>
        </div>
        <div>
          <span className="metricLabel">理想操作步数</span>
          <strong>{level.idealOperationSteps} 步</strong>
        </div>
        <div>
          <span className="metricLabel">时间目标</span>
          <strong>{level.timeTargetSeconds} 秒</strong>
        </div>
      </div>

      <div className="forbiddenBox">
        <h3>禁忌项</h3>
        {level.forbiddenRules.length === 0 ? (
          <p>本关没有额外禁忌，重点是把区域说清楚。</p>
        ) : (
          <ul>
            {level.forbiddenRules.map((rule) => (
              <li key={rule.id}>{rule.label}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
