// @flow
import strip from 'strip-ansi';

/**
 * Pads a value with a space or a specified delimiter to match a given width.
 */
export default function pad(value: string, width: number, delimiter?: string): string {
  return value + (delimiter || ' ').repeat(Math.max(0, Math.floor(width) - strip(value).length));
}
