export const defaultCode = `#include <stdio.h>

int main(void) {
  int x = 1;
  int y = 2;
  int z = x + y;
  printf("z=%d\\n", z);
  return 0;
}
`;

export const FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export const FONT_SIZE = 13;

/** Must match what the worker compiles (`rt.fs` key) and DAP setBreakpoints path. */
export const SOURCE_PATH = '/main.c';
