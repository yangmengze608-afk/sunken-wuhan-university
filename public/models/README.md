# Models / 三维模型

此目录只存放可在网页中直接加载的 `.glb` / `.gltf` 资产。

推荐结构：

```text
models/
├── terrain/
├── heritage-core/
│   ├── 912-field/
│   ├── old-dormitories/
│   ├── hundred-steps/
│   └── old-library/
├── main-gate/
├── administration-science/
├── east-lake-edge/
└── campus-network/
```

正式加入模型前必须同步更新：

1. `public/data/assets.registry.json`
2. `public/data/campus.masterplan.json`
3. `public/data/sources.registry.json`
4. 对应建筑的来源、尺寸、许可和推算说明

Blender 源文件不放在 `public/` 下；正式模型应使用米制、Y 轴向上并应用导出变换。
