## 2024-05-24 - Optimize rival heya lookup loop
**Learning:** Using chained `.filter().sort().map()[0]` on hot paths causes unnecessary intermediate allocations and O(N log N) complexity, slowing down engine ticks.
**Action:** Replace these chains with manual, single-pass `for` loops to reduce algorithmic complexity to O(N) and minimize GC pressure.
