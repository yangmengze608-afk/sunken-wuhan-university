# Campus Geodata Pipeline / 校园地理数据管线

## 中文

### 目标

V2 最终必须由一张连续、统一、可追溯的武汉大学校园总图驱动。`public/data/campus.geodata.geojson` 是道路、建筑基底、操场、台阶和岸线引导的统一矢量入口。

当前文件中的几何均为项目自制的工程占位轮廓，只用于证明以下能力已经成立：

- 多边形建筑可以直接挤出为三维体量；
- 道路、台阶和岸线可以按折线连续渲染；
- 地点导航能够按照真实轮廓的包围盒聚焦；
- 一个地点有矢量轮廓后，不再重复生成中心点方盒；
- 每个要素必须绑定来源、许可、精度和替换状态；
- 所有坐标必须落在同一个完整校园世界边界内。

### 允许的数据来源

正式轮廓只能来自可追溯来源，例如：

1. 获得明确使用许可的武汉大学官方地图或数据；
2. 记录导出时间、范围和对象 ID 的 OpenStreetMap / ODbL 数据；
3. 具有明确作者与许可的历史地图；
4. 开发者自行测量、拍摄和绘制的数据；
5. 其他取得明确授权的地图、航拍或测量成果。

网页截图、搜索缩略图、无作者地图、无法确认许可的数据以及未经授权抓取的官方地图，不得进入正式 GeoJSON。

### 导入步骤

1. 在 `public/data/sources.registry.json` 中登记来源。
2. 保存原始导出日期、范围、格式、许可和对象 ID。
3. 将经纬度数据转换到项目统一的本地米制坐标。
4. 为每个 Feature 填写：
   - `id`
   - `nameZh` / `nameEn`
   - `renderRole`
   - `placeId`
   - `height` 或 `width`
   - `accuracy`
   - `sourceStatus`
   - `sourceIds`
   - `licenseStatus`
   - `replacementStatus`
5. 运行 `npm run validate:data`。
6. 只有多源交叉核验完成后，才能把 `accuracy` 和 `replacementStatus` 改为 `verified`。
7. 提交后必须通过 GitHub Actions，再进入预览或主分支。

### 精度等级

- `placeholder`：工程占位，不能对外描述为真实复原；
- `estimated`：依据地图、照片或测量推算，但仍存在误差；
- `verified`：已经完成来源、位置、比例和许可核验。

任何使用 `source-internal-placeholder-v2` 的要素都不能标记为 `verified`。

### 坐标原则

GeoJSON 当前使用 `[x, z]` 的本地米制坐标，而不是经纬度。所有图层共用 `whole-campus.layout.json` 的唯一世界原点。

导入经纬度数据时必须：

- 保存原始 WGS84 数据；
- 明确本地原点；
- 记录投影或近似转换方法；
- 检查旋转、比例、南北方向和高程；
- 不得对不同来源分别设置互不兼容的原点。

### CI 数据闸门

`npm run build` 会先运行 `npm run validate:data`，检查：

- 地点、资产、来源和 Feature ID 是否重复或缺失；
- 建筑多边形是否闭合；
- 路线是否至少包含两个坐标；
- 所有坐标和覆盖区是否位于完整世界边界内；
- `placeId`、`assetId`、`sourceIds` 是否真实存在；
- `verified` 要素是否仍在引用内部占位数据。

## English

### Objective

V2 must ultimately be driven by one continuous, unified, and traceable Wuhan University campus master plan. `public/data/campus.geodata.geojson` is the common vector entry point for building footprints, roads, sports grounds, stairs, open spaces, and shoreline guides.

The current geometry is project-created placeholder data. It proves that polygon extrusion, continuous route rendering, footprint-based navigation, source validation, and seamless replacement are working; it is not surveyed campus geometry.

### Accepted sources

Production geometry may come only from traceable sources, including:

1. Wuhan University official maps or datasets with explicit permission;
2. OpenStreetMap / ODbL exports with recorded date, extent, and object IDs;
3. historic maps with identifiable authors and licenses;
4. project-created survey, photography, and tracing work;
5. other maps, aerial references, or survey outputs with explicit authorization.

Search thumbnails, unattributed maps, unclear-license data, and unauthorized scraping of official maps must not enter the production GeoJSON.

### Import workflow

1. Register the source in `public/data/sources.registry.json`.
2. Preserve export date, extent, format, license, and source object IDs.
3. Convert geographic coordinates into the project's single local metric coordinate system.
4. Complete every Feature's identity, render role, linked place, dimensions, accuracy, source IDs, license state, and replacement state.
5. Run `npm run validate:data`.
6. Mark geometry as `verified` only after source, position, scale, and licensing checks are complete.
7. Require GitHub Actions to pass before preview or merge.

### Accuracy states

- `placeholder`: engineering-only geometry;
- `estimated`: derived from references but still uncertain;
- `verified`: source, location, proportions, and license have been checked.

A Feature that still references `source-internal-placeholder-v2` can never be marked `verified`.

### Coordinate policy

The current GeoJSON uses local metric `[x, z]` coordinates rather than longitude and latitude. Every layer shares the single origin defined by `whole-campus.layout.json`. Raw WGS84 source data, the chosen origin, projection method, rotation, scale, and elevation treatment must all be recorded during import.
