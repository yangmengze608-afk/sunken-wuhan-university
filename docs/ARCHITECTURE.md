# V2 Architecture / V2 架构

## 中文

V2 的目标不是优先增加玩法，而是让武汉大学校园能够被**持续、可追溯、分区、逐栋**重建。

### 核心原则

1. **场景与资料分离**：地点、坐标、精度和状态存放在 `public/data/campus.masterplan.json`。
2. **场景与模型分离**：模型路径和生产状态存放在 `public/data/assets.registry.json`。
3. **事实与推测分离**：坐标、尺寸和建筑身份必须标记为 `placeholder`、`estimated` 或 `verified`。
4. **素材与许可分离**：照片、地图、测量记录和模型许可统一登记在 `public/data/sources.registry.json`。
5. **旧版不丢失**：原单文件程序化场景继续作为水下着色、粒子和环境效果参考。

### 目录职责

```text
src/
├── assets/       # glTF 资产类型、登记加载与模型加载器
├── data/         # 校园总图数据类型和加载器
├── viewer/       # 三维浏览、占位体、相机与选点
├── main.ts       # 页面装配和数据状态展示
└── styles.css    # 浏览界面

public/
├── data/         # 校园、资产、资料来源登记
├── models/       # 按分区和建筑存放 GLB
├── textures/     # 项目自制或明确授权的纹理
└── audio/        # 项目自制或明确授权的环境音
```

### 数据流

```text
campus.masterplan.json
        ↓
地点目录 + 坐标占位 + 精度状态
        ↓
assets.registry.json
        ↓
ModelAssetLoader / GLTFLoader
        ↓
占位体逐栋替换为精细 GLB
```

### 当前 Alpha 的意义

当前 V2 Alpha 只证明以下事情已经成立：

- 校园分区可以独立维护；
- 每个地点有自己的精度与来源状态；
- 建筑模型可以按资产 ID 和路径逐栋接入；
- 未核验数据会在界面上直接暴露，而不是伪装成准确复原；
- 后续能够在不重写整个场景的前提下扩展到更多教学楼、宿舍、道路和设施。

## English

V2 is designed as a traceable, zone-based, building-by-building reconstruction system rather than a gameplay-first project.

The campus master plan, 3D asset registry, and source/licensing registry are maintained separately. Every coordinate, dimension, and model must carry an explicit accuracy state: `placeholder`, `estimated`, or `verified`. The procedural V1 remains in the repository as a visual-effects reference while V2 replaces symbolic geometry with independently produced glTF assets.
