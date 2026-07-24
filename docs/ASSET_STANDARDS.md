# Asset Standards / 建筑资产标准

## 1. 坐标与比例

- Blender 和 Three.js 统一使用米制：`1 Blender Unit = 1 meter`。
- 模型原点放在建筑主入口地面中心，或在资产说明中记录其他原点规则。
- Y 轴向上；导出 glTF / GLB 时应用旋转和缩放。
- 未经地图、现场测量或多视角照片核验的尺寸必须标记为 `placeholder` 或 `estimated`。
- 不允许为了“看起来像”而悄悄修改真实比例；艺术化水下破损应与基础复原模型分层保存。

## 2. 模型层级

每个重点建筑建议保留：

```text
building-name/
├── source/                 # Blender 源文件，不直接在网页加载
├── references/             # 可合法保存的参考资料与来源说明
├── textures/               # 该建筑独立纹理
├── building-name.glb       # 网页主资产
├── building-name-lod1.glb  # 中距离
├── building-name-lod2.glb  # 远距离
└── asset-notes.md          # 尺寸、来源、推算与许可
```

## 3. 建模精度等级

| 等级 | 含义 | 可以公开描述为 |
|---|---|---|
| P0 | 基础方盒或范围标记 | 工程占位 |
| P1 | 主要体量和轮廓 | 体块复原 |
| P2 | 门窗、柱廊、屋顶和台阶 | 中等精度复原 |
| P3 | 立面构件、材质分区和周边空间 | 精细复原 |
| P4 | 尺寸、立面和资料均经交叉核验 | 高精度数字重建 |

P4 不是“面数很多”，而是资料、比例、位置和细节都能追溯。

## 4. PBR 材质

优先使用 glTF 金属度工作流：

- Base Color
- Normal
- Roughness
- Metallic（多数石材、瓦片、混凝土接近 0）
- Ambient Occlusion
- 可选 Height / Displacement（只用于近景资产）

建议重点建筑使用独立 2K–4K 纹理集；重复窗、瓦、栏杆等构件应使用实例化或共享材质，避免无意义地复制纹理。

## 5. 网页性能

建议预算不是硬性上限，但超出时必须说明：

- P3 重点建筑主模型：约 100k–500k triangles；
- 普通教学楼：约 40k–200k triangles；
- 远景 LOD：主模型三角面数的 5%–20%；
- 单张纹理优先不超过 4K；
- 使用 Draco 或 Meshopt 压缩几何；
- 后续使用 KTX2 / Basis 压缩纹理；
- 重复植被、路灯、座椅、护栏必须实例化。

## 6. 资料、版权与商标

- 不直接复制武汉大学官网照片、宣传视频、校徽、Logo 或官方设计文件作为游戏资产，除非获得明确许可。
- 参考照片只用于观察时，也要登记作者、链接、访问日期和允许用途。
- 自己拍摄的照片应保留原始文件和拍摄日期。
- 第三方模型必须记录许可证；来源不明模型不得进入正式版本。
- 建筑基础模型与“沉没、破损、藻类覆盖”等艺术化版本分开保存，避免无法区分史实与创作。
- 项目页面持续标注：独立学生创作，非武汉大学官方产品。

## 7. English Summary

All assets use meters, Y-up coordinates, applied transforms, traceable references, and explicit accuracy states. High fidelity means verified proportions, placement, facade structure, and source records—not merely high polygon counts. Official logos, photographs, promotional materials, and unknown-origin models must not be reused without permission. Base reconstruction assets and fictional underwater damage variants must remain separate.
