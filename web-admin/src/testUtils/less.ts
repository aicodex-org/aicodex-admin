import fs from "fs";
import path from "path";

const createLessImportPattern = (): RegExp => /@import\s+(?:\([^)]+\)\s*)?["']([^"']+)["']\s*;/g;

const resolveLessImportPath = (currentFilePath: string, importPath: string): string => {
  const resolvedPath = path.resolve(path.dirname(currentFilePath), importPath);

  if (fs.existsSync(resolvedPath)) {
    return resolvedPath;
  }

  if (path.extname(resolvedPath) === "" && fs.existsSync(`${resolvedPath}.less`)) {
    return `${resolvedPath}.less`;
  }

  return resolvedPath;
};

export const extractLessImports = (source: string): string[] => {
  return Array.from(source.matchAll(createLessImportPattern())).map((match) => match[1]);
};

// 递归展开项目 Less import，便于样式 contract 测试断言聚合后的有效源码。
export const readLessWithImports = (filePath: string, seen = new Set<string>()): string => {
  const resolvedPath = path.resolve(filePath);

  if (seen.has(resolvedPath)) {
    return "";
  }

  seen.add(resolvedPath);

  const source = fs.readFileSync(resolvedPath, "utf8") as string;

  return source.replace(createLessImportPattern(), (_match, importPath: string) => {
    return readLessWithImports(resolveLessImportPath(resolvedPath, importPath), seen);
  });
};
