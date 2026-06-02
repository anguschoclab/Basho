import { vi, test } from 'vitest';
test('check vi', () => {
  console.log('vi keys:', Object.keys(vi).slice(0, 30));
  console.log('mocked:', typeof (vi as any).mocked);
});
