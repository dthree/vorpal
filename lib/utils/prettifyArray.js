// @flow
import strip from 'strip-ansi';
import pad from './pad';
import { PADDING_SIZE } from '../constants';

/**
 * Formats an array for display in a TTY in a pretty fashion.
 */
export default function prettifyArray(baseArray?: string[]): string {
  const array = baseArray ? [...baseArray] : [];

  // Calculate widths
  // $FlowIgnore `columns` is not defined
  const maxWidth = process.stdout.columns;
  const longestWidth = array.reduce((longest, item) => {
    const { length } = strip(item);

    return (length > longest) ? length : longest;
  }, 0) + PADDING_SIZE;
  const fullWidth = strip(array.join('')).length;

  // Does it fit on one line?
  if ((fullWidth + (array.length * PADDING_SIZE)) <= maxWidth) {
    return array.join('  ');
  }

  // Generate the output
  const lines = [];
  const cols = Math.min(1, Math.floor(maxWidth / longestWidth));
  let line = '';
  let col = 0;

  array.forEach((item) => {
    if (col < cols) {
      col += 1;
    } else {
      lines.push(line);
      line = '';
      col = 1;
    }

    line += pad(item, longestWidth);
  });

  if (line !== '') {
    lines.push(line);
  }

  return lines.join('\n');
}
