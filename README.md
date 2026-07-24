# 水下珞珈 · Sunken Luojia

> 一个以武汉大学校园空间、建筑与文化记忆为核心的高精度水下数字重建项目。  
> A high-fidelity underwater digital reconstruction centered on the campus spaces, architecture, and cultural memory of Wuhan University.

## 中文

### 项目定位

《水下珞珈》不是以“游戏机制”为优先的项目，而是以**武汉大学校园的完整度、准确度与细节还原**为第一目标。

项目希望逐步重建珞珈山地形、东湖岸线、校园道路、操场、教学楼、宿舍、历史建筑、园林植被与公共设施，并在此基础上提供可自由漫游的水下视觉体验。

交互系统的作用是帮助用户观察与理解场景，而不是取代建筑和校园本体：

- 第一优先级：校园范围与空间结构完整；
- 第二优先级：标志性建筑比例、轮廓与立面准确；
- 第三优先级：材质、植被、道路、台阶、路灯、标牌等细节真实；
- 第四优先级：水下光照、沉积、雾、鱼群与环境音统一；
- 第五优先级：漫游、导览、地点信息与轻量互动。

### 当前版本

当前 `main` 分支是一个基于 Three.js 的单文件程序化概念版本，包含：

- 珞珈山与东湖水下地形；
- 武大牌坊；
- 老斋舍与樱顶；
- 老图书馆；
- 行政主楼；
- 理学楼；
- 枫园湖滨教学楼；
- 六一亭；
- 樱花大道、梧桐林荫道、百步梯、路灯与湖滨栈道；
- 水下焦散、体积雾、沉积物、鱼群、气泡、水母与环境音。

这些建筑目前主要由程序化基础几何体生成，能够表达地点特征，但还不能达到高精度复原标准。

### V2 重建方向

V2 在 `agent/v2-game-rebuild` 分支开发，目标是从“程序化概念场景”升级为“可持续扩展的高精度校园数字重建工程”。

核心方向：

1. 建立真实校园地图和分区坐标体系；
2. 建立 Blender / glTF 建筑资产管线；
3. 按真实照片、地图、公开资料与现场测量逐栋建模；
4. 补充操场、教学楼群、宿舍区、道路、台阶、围墙、绿地和公共设施；
5. 为建筑制作独立 PBR 材质，而不是复用通用立面；
6. 建立来源记录、版本记录和资产精度等级；
7. 在网页端保留可漫游、可查看地点信息的轻量交互。

### 建设优先级

第一阶段优先补齐武汉大学最具辨识度的核心空间：

- 912 操场、跑道、看台与周边高差；
- 老斋舍、樱顶、百步梯与老图书馆建筑群；
- 武大牌坊与主入口道路；
- 行政楼、理学楼及相邻教学建筑；
- 樱花大道和主要林荫道路；
- 珞珈山地形与东湖岸线关系。

随后扩展：

- 各院系教学楼；
- 宿舍区与生活区；
- 体育设施；
- 校园道路和步行系统；
- 历史建筑与纪念设施；
- 标牌、路灯、座椅、护栏、井盖等微观细节。

### 精度标准

每个重点建筑至少应记录：

- 名称与所属区域；
- 参考照片和资料来源；
- 建筑大致年代与功能；
- 平面尺寸和高度估计；
- 主要立面结构；
- 屋顶、门窗、台阶、柱廊与装饰特征；
- 材质和颜色；
- 模型版本与可信度等级。

项目会明确区分：

- 已由公开资料确认的事实；
- 根据照片和地图推算的尺寸；
- 为水下叙事进行的艺术化处理；
- 尚待验证或替换的临时模型。

### 运行当前版本

直接打开 `水下武汉大学.html`，或启动静态服务器：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/水下武汉大学.html
```

### 独立项目声明

本项目为独立的学生创作、技术研究与非官方数字艺术项目，与武汉大学不存在官方隶属、委托、合作或授权关系。

项目中的校园建筑与空间由开发者依据公开可见资料重新创作。除非另有明确说明，本项目不使用武汉大学官方校徽、官方品牌标识、官方三维资产或未经许可的宣传素材。

“武汉大学”及相关名称、标志和品牌权益归其各自权利人所有。项目不会将自身描述为武汉大学官方产品或官方数字孪生系统。

---

## English

### Project Positioning

Sunken Luojia is not primarily a gameplay-driven project. Its first objective is the **completeness, accuracy, and visual fidelity of Wuhan University’s campus environment**.

The project aims to progressively reconstruct Luojia Hill, the East Lake shoreline, campus roads, sports fields, academic buildings, dormitories, historic architecture, landscape vegetation, and public facilities, then present them through an explorable underwater environment.

Interaction exists to support observation and understanding of the campus rather than replace it:

- First priority: complete campus coverage and spatial structure;
- Second priority: accurate proportions, silhouettes, and façades of landmarks;
- Third priority: realistic materials, vegetation, roads, stairs, lamps, signage, and small-scale details;
- Fourth priority: a consistent underwater atmosphere, including lighting, sediment, fog, fish, and ambient sound;
- Fifth priority: navigation, guided viewing, location information, and lightweight interaction.

### Current Version

The current `main` branch is a single-file procedural Three.js concept scene containing:

- Luojia Hill and the submerged East Lake terrain;
- Wuhan University gate;
- Old Dormitories and Cherry Blossom Castle;
- Old Library;
- Administration Building;
- Science Hall;
- Fengyuan lakeside academic ruins;
- June First Pavilion;
- Cherry Blossom Avenue, tree-lined roads, stone stairs, street lamps, and a lakeside boardwalk;
- underwater caustics, volumetric fog, sediment, fish, bubbles, jellyfish, and ambient audio.

Most buildings are currently constructed from procedural primitive geometry. They communicate recognizable landmarks but do not yet meet the standard of high-fidelity reconstruction.

### V2 Direction

V2 is developed on the `agent/v2-game-rebuild` branch. Its goal is to evolve the project from a procedural concept scene into a maintainable, high-fidelity campus reconstruction system.

Core directions:

1. Establish a real campus map and district-based coordinate system;
2. Build a Blender-to-glTF asset pipeline;
3. Model buildings individually from photographs, maps, public references, and measurements where available;
4. Add sports fields, academic complexes, dormitories, roads, stairs, walls, green spaces, and public facilities;
5. Create dedicated PBR materials for major buildings instead of reusing a generic façade texture;
6. Maintain source records, version history, and asset-confidence levels;
7. Preserve lightweight web-based exploration and location information.

### Reconstruction Priorities

The first stage focuses on the most recognizable core areas:

- The 912 sports field, running track, stands, and surrounding elevation changes;
- Old Dormitories, Cherry Blossom Castle, the Hundred-Step Stairway, and the Old Library complex;
- The university gate and main entrance route;
- The Administration Building, Science Hall, and nearby academic buildings;
- Cherry Blossom Avenue and major tree-lined roads;
- The spatial relationship between Luojia Hill and the East Lake shoreline.

Later phases will expand to:

- Faculty and department buildings;
- Dormitory and residential areas;
- Sports facilities;
- Campus roads and pedestrian networks;
- Historic and commemorative structures;
- Signs, lamps, benches, railings, utility covers, and other micro-details.

### Accuracy Standard

Each major building should document:

- Name and campus district;
- Reference images and source materials;
- Approximate construction period and function;
- Estimated footprint and height;
- Major façade structure;
- Roof, door, window, stair, colonnade, and decorative features;
- Materials and colors;
- Model version and confidence level.

The project will clearly distinguish between:

- facts confirmed by public sources;
- dimensions inferred from images and maps;
- artistic changes made for the underwater narrative;
- temporary models that still require verification or replacement.

### Running the Current Version

Open `水下武汉大学.html` directly, or run a static server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000/水下武汉大学.html
```

### Independent Project Disclaimer

This is an independent student creative work, technical study, and unofficial digital-art project. It is not affiliated with, commissioned by, partnered with, or officially authorized by Wuhan University.

Campus spaces and buildings are independently recreated from publicly visible references. Unless explicitly stated otherwise, the project does not use Wuhan University’s official emblem, official brand assets, official 3D assets, or unauthorized promotional materials.

“Wuhan University” and related names, marks, and brand rights belong to their respective owners. This project does not present itself as an official Wuhan University product or an official digital-twin system.

## License

Code is released under the terms described in [LICENSE](LICENSE). Individual third-party assets, if introduced later, must retain their own license and attribution records.
