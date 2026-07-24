# V2 Architecture / V2 架构

## 中文

V2 的目标不是优先增加玩法，而是让武汉大学校园能够被**持续、可追溯、逐栋建模，并最终组合成一个完整、连续、统一的大型校园世界**。

## 不可改变的最终形态：一张完整校园

最终成品必须是一张连续的武汉大学整体地图，而不是“一个地点一个房间”、地点选择菜单或互不相连的独立场景。

用户应当能够在同一个世界坐标系中连续移动，例如：

- 从武汉大学牌坊进入校园；
- 沿真实道路和林荫系统前进；
- 到达行政楼、理学楼和教学区；
- 穿过樱花大道；
- 经过九一二操场、老斋舍、百步梯并登上樱顶；
- 继续前往老图书馆、宿舍区、生活区和东湖岸线。

整个过程中不应出现传送门、切换关卡、进入独立地点副本或重新加载另一个校园空间。建筑、道路、山体、操场、植被和岸线必须在同一套全局坐标中保持正确的相互关系、距离、高差和视线关系。

当前数据中的 `zones` 只允许承担以下内部工程职责：

- 资料整理和工作任务拆分；
- 模型目录与责任范围划分；
- 运行时按距离进行资源流式加载；
- LOD、纹理和内存管理；
- 开发阶段的调试与进度统计。

`zones` **不是独立场景、房间或关卡**，也不应在最终体验中形成可见边界。分区加载必须对用户透明，加载区交界处不得出现跳转、黑屏、地形断裂或建筑消失。

### 核心原则

1. **一个全局世界坐标系**：所有地形、道路、建筑和设施共用统一的米制坐标，局部模型不得各自建立互不兼容的世界原点。
2. **先总图，后单体**：先确认校园整体边界、道路骨架、山体高差和岸线关系，再逐栋替换高精度建筑。
3. **连续空间优先**：任何单体建筑的精细化都不能破坏周边道路、地形、视线和相邻建筑关系。
4. **场景与资料分离**：地点、坐标、精度和状态存放在 `public/data/campus.masterplan.json`。
5. **场景与模型分离**：模型路径和生产状态存放在 `public/data/assets.registry.json`。
6. **事实与推测分离**：坐标、尺寸和建筑身份必须标记为 `placeholder`、`estimated` 或 `verified`。
7. **素材与许可分离**：照片、地图、测量记录和模型许可统一登记在 `public/data/sources.registry.json`。
8. **旧版不丢失**：原单文件程序化场景继续作为水下着色、粒子和环境效果参考。

### 推荐的世界组织方式

```text
WholeCampusWorld（唯一连续世界）
├── GlobalTerrain          # 珞珈山、坡地、地面高差
├── CampusRoadNetwork      # 车行道、步行道、台阶和连接关系
├── EastLakeShoreline      # 岸线、水体边界和湖滨空间
├── Buildings              # 所有建筑放入同一全局坐标
├── SportsAndOpenSpaces    # 操场、广场、草地和庭院
├── Vegetation             # 树木、灌木和地被
├── CampusFacilities       # 标牌、路灯、座椅、护栏等
└── StreamingRegions       # 仅用于不可见的性能管理
```

大型校园应采用流式加载，而不是拆成互不相连的页面：玩家附近加载高精度模型，远处保留低精度 LOD 或轮廓；地形、道路主干和远景地标始终保持连续可见。

### 目录职责

```text
src/
├── assets/       # glTF 资产类型、登记加载与模型加载器
├── data/         # 校园总图数据类型和加载器
├── viewer/       # 连续校园三维浏览、相机、选点与流式加载
├── world/        # 全局地形、道路网络、岸线和世界装配（后续新增）
├── main.ts       # 页面装配和数据状态展示
└── styles.css    # 浏览界面

public/
├── data/         # 校园、资产、资料来源登记
├── models/       # 按工程分区存放 GLB，但加载到同一世界
├── textures/     # 项目自制或明确授权的纹理
└── audio/        # 项目自制或明确授权的环境音
```

### 数据流

```text
真实校园总图 / 地形 / 道路骨架
                ↓
campus.masterplan.json（统一全局坐标）
                ↓
WholeCampusWorld（唯一连续世界）
                ↓
assets.registry.json
                ↓
ModelAssetLoader / GLTFLoader / LOD / Streaming
                ↓
占位体逐栋替换为精细 GLB，但空间关系保持不变
```

### 当前 Alpha 的意义

当前 V2 Alpha 只证明以下事情已经成立：

- 校园地点可以在同一个世界坐标中登记；
- 工程分区可以独立维护，但不会成为独立空间；
- 每个地点有自己的精度与来源状态；
- 建筑模型可以按资产 ID 和路径逐栋接入；
- 未核验数据会在界面上直接暴露，而不是伪装成准确复原；
- 后续能够在不重写整个世界的前提下扩展到更多教学楼、宿舍、道路和设施。

当前占位图只用于验证数据和资产管线。它不能被理解为最终地图结构，也不能以“选择一个地点进入”的方式继续发展。

---

## English

V2 is not gameplay-first. Its purpose is to reconstruct Wuhan University in a traceable, building-by-building process and ultimately assemble every asset into **one complete, continuous, unified campus world**.

## Non-negotiable final form: one continuous campus

The final result must not be a collection of separate rooms, location instances, levels, or menu-driven scenes. A visitor must be able to travel continuously from the university archway through the road network, academic precincts, Cherry Blossom Avenue, the 912 sports field, Old Dormitories, the Hundred-Step Stairway, Cherry Blossom Castle, the Old Library, residential areas, and the East Lake shoreline without portals or level transitions.

All terrain, roads, buildings, sports facilities, vegetation, and shoreline elements must share one global metric coordinate system. Their distances, elevations, adjacency, and sightlines must remain spatially consistent.

The current `zones` are engineering-only partitions for research organization, asset ownership, runtime streaming, LOD control, memory management, and debugging. They are **not separate scenes or levels** and must never create visible borders, loading screens, terrain seams, or teleportation in the final experience.

### Core principles

1. **One global world coordinate system** for every terrain and asset.
2. **Master plan before individual buildings**: establish campus boundaries, road structure, elevation, and shoreline before detailed replacements.
3. **Continuous spatial relationships first**: individual detail must not break neighboring roads, terrain, views, or building relationships.
4. Separate scene data from reference and accuracy records.
5. Separate model files from placement and production status.
6. Label facts, estimates, and placeholders explicitly.
7. Track every source and license independently.
8. Preserve V1 as a visual-effects reference.

### World organization

```text
WholeCampusWorld (the only continuous world)
├── GlobalTerrain
├── CampusRoadNetwork
├── EastLakeShoreline
├── Buildings
├── SportsAndOpenSpaces
├── Vegetation
├── CampusFacilities
└── StreamingRegions (invisible performance partitions only)
```

The large campus should use seamless streaming rather than disconnected pages. Nearby assets may load at high fidelity while distant areas use lower LODs, but the terrain, road skeleton, and major silhouettes must remain continuous and visible.

The current Alpha validates the data and asset pipeline only. It must not evolve into a location-selection experience; every future asset must be placed into the same continuous campus world.