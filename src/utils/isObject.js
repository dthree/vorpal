// @flow

export default function isObject(value: *): boolean {
  return (value !== null && typeof value === 'object' && !Array.isArray(value));
}
