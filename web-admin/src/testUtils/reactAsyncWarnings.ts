const actWarningText = ["not wrapped", "in act"].join(" ");
const unsupportedActEnvironmentText = ["current testing environment", "is not configured to support act"].join(" ");
const antdWarningText = "Warning: [antd:";

export type ConsoleCallSpy = {
  mock: {calls: unknown[][]};
  mockRestore: () => void;
};

function isReactActWarning(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes(actWarningText) || normalizedMessage.includes(unsupportedActEnvironmentText);
}

// 仅分类已经由 suite 捕获的 console 调用；调用方仍负责保留原始 console 行为并恢复 spy。
export function getReactActWarnings(calls: ReadonlyArray<ReadonlyArray<unknown>>): string[] {
  return calls
    .map(args => args.map(value => String(value)).join(" "))
    .filter(isReactActWarning);
}

// 只识别 AntD 自身的 runtime warning；React 和其它 console 诊断继续由各 suite 独立处理。
export function getAntdWarnings(calls: ReadonlyArray<ReadonlyArray<unknown>>): string[] {
  return calls
    .map(args => args.map(value => String(value)).join(" "))
    .filter(message => message.includes(antdWarningText));
}

// 返回用文本匹配后直接 return 的测试源码行，防止重新引入局部 act warning suppression。
export function findReactActWarningSuppressions(source: string): number[] {
  const lines = source.split(/\r?\n/);
  return lines.flatMap((line, index) => {
    if (!isReactActWarning(line)) {
      return [];
    }
    const nearbySource = lines.slice(index, index + 5).join("\n");
    return /\breturn(?:\s+undefined)?\s*;/.test(nearbySource) ? [index + 1] : [];
  });
}
