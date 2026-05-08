export const defaultCode = `#include <stdio.h>

int main(void) {
  int x = 1;
  int y = 2;
  int z = x + y;
  printf("z=%d\\n", z);
  return 0;
}
`;

/** Must match what the worker compiles (`rt.fs` key) and DAP setBreakpoints path. */
export const SOURCE_PATH = '/main.c';
