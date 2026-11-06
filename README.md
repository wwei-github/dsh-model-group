# dsh-model-group

在 DeepSeek Harness 的输入框上方，给模型名补上它所属的**分组（provider）名称**：

```
Trae · DeepSeek-V4.1-Flash · x0.09 Default
└─┬─┘   └──────────┬─────────┘
分组名           模型名（` · x0.09` 是模型名的一部分）
```

## 为什么需要插件

模型选择器把模型名当纯字符串渲染，**没有任何设置项能打开分组名**。唯一的入口是
`conversation.input.model.label` 这个单槽（single slot）：

- 槽的契约是「渲染非交互的内联内容（彩色名称、角标）」；点击、焦点、勾选、
  无障碍文案仍然归 picker 自己；
- 传给占位组件的 props 里带着 `provider: { id, name }`，`name` 就是设置里看到的
  分组显示名（`trae` → `Trae`、`trae-enterprise` → `Trae 企业版`、
  `deepseek-account` → `DeepSeek 账号`）；
- 官方文档给出的示例本身就是
  `({ provider, model }) => React.createElement('span', { title: provider.name }, model.name)`。

所以「在模型名前面显示分组名」= 注册这个槽，把 `provider.name` 画在 `model.name` 前面。

## 覆盖关系

该槽是 single 槽，同一时刻只有一个占位者。当前实际渲染的是
`dsh-connect-workbuddy` 的 `WorkBuddyModelLabel`（priority `-0.5`）；
`dsh-connect-trae` 也注册了（默认 priority `0`），被前者盖住。

本插件的 priority 由框架自动分配且「越晚注册越低」，因此会盖掉两者。代价是：

- workbuddy 的倍率角标、促销 badge、忙碌图标、新模型标记不再显示；
- trae 的 `PromoChip` 不再显示。

模型名里 ` · x0.09` 这段是写进 `name` 的，不是渲染出来的，所以会原样保留。

## 安装

本包没有依赖、没有构建步骤，用本地目录链接安装即可：

1. 打开「设置 → 插件」的安装输入框；
2. 粘贴本仓库的**绝对路径**（相对路径会被拒）：

   ```
   /Users/wangwei/Documents/github/dsh-model-group
   ```

3. 确认安装，等它出现在插件列表并处于启用状态。

安装走 `PluginManager.installBundle`：`pnpm add <path>` → 校验 `package.json` 的
`dsh.bundle.patch` → 选中 bundle → 发布并重载。纯 `insert` 的 patch 可以热挂载，
不需要重启应用。

> 如果 UI 拒绝这个路径，说明该版本把输入框限定成了注册表包名；此时只能用
> `plugin_manager` 工具的 `install_bundle`（`target` 传上面的绝对路径），
> 或把它发布到 npm 后按包名安装。

## 文件

| 文件 | 作用 |
| --- | --- |
| `package.json` | 包清单；`dsh.bundle.patch` + `dsh.client`（`platform: web`、`inject` 会话包） |
| `cordis.patch.yml` | 往配置里插一行 `{ id, name }`；`name` 必须等于真实包名 |
| `index.js` | Host 半边，本插件无工具/路由，`apply()` 为空 |
| `client.js` | 客户端半边，注册 `conversation.input.model.label` 槽 |
| `locale/*.json` | 插件管理页显示的标题与描述 |
| `icon.svg` | 插件图标 |

`client.js` 里的 factory id 必须与 `cordis.patch.yml` 的 `id` 一致，否则
ModuleLoader 会报 `loaded without registering <id>`。

## 验证

看输入框上方的模型名是否变成 `分组名 · 模型名`。没变化时依次排查：

1. 插件列表里是否已启用（未启用则没有注册任何槽）；
2. 控制台是否出现 `loaded without registering` 或槽注册冲突；
3. 换一个分组下的模型（例如从 Trae 切到 WorkBuddy），确认前缀跟着变。
