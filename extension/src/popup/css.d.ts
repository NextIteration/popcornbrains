// Allow CSS imports in TypeScript (used by the popup)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
