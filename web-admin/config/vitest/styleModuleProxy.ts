const classNames = new Proxy<Record<string, string>>({}, {
  get: (_target, property) => typeof property === "string" ? property : "",
});

export default classNames;
