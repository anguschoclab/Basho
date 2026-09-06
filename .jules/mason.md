## 2025-05-18 - [Tighten YouthAcademyService Types]
**Finding:** Spreading `heya` into `builder.updateHeya()` was unnecessarily double-cast as `...(heya as unknown as Record<string, unknown>)`. Also, accessing `heya.youthAcademy` was over-cast as `(heya as unknown as { youthAcademy?: YouthAcademyState }).youthAcademy`.
**Learning:** `updateHeya` accepts `Partial<Heya>`, and `heya` is structurally compatible with it. Furthermore, `youthAcademy` is explicitly defined on the `Heya` interface, making the access cast redundant.
**Constraint:** Do not use `as unknown as Record<string, unknown>` to bypass type checking when spreading objects into functions that accept `Partial<T>`, provided the object is already of type `T` or structurally compatible.
