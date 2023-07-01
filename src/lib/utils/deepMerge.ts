//! https://stackoverflow.com/a/34749873/14591737

function isObject(item: unknown) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

// TODO: Have an accurate return type
export function deepMerge(target: object, ...sources: object[]) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const k in source) {
      const key = k as keyof typeof source;
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}
