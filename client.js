/**
 * dsh-model-group — 客户端半边。
 *
 * 作用：把模型所属的分组（provider）名显示在两处
 * 1. composer 触发按钮：`Trae · DeepSeek-V4.1-Flash · x0.09`（补在模型名前）；
 * 2. 模型选择浮框：在 `Model` 行**上方**新增一行不可点击的分组名，
 *    `Model` 行本身仍只显示模型名。
 *
 * 为什么只能这么做：picker 把模型名当纯字符串渲染，宿主只为这一处开了口子 ——
 * `conversation.input.model.label` 槽，契约是「渲染非交互的内联内容（彩色名称/角标）」，
 * 点击、焦点、勾选、无障碍文案仍归 picker 自己。分组名就在 props 里：
 * `provider: { id, name }`，`name` 是用户在设置里看到的分组显示名。
 *
 * 浮框那一行没有槽可用：宿主声明的 input 槽只有
 * `activity / attachments / dock / left / model / model.label / overlay / permission / plan / right`，
 * 浮框（role="menu" 的 surface）内部结构由 model-selection 自己渲染，所以只能由
 * `menu` placement 的组件在提交后往上找最近的 `[role="menu"]` 容器，手动
 * `insertBefore` 到第一个 `button.cell` 之前。插入的节点带
 * `data-dsh-model-group-row`，`pointer-events: none`，不进 React 的 children 列表，
 * 浮框关闭时随 surface 一起卸载。
 *
 * 覆盖关系：该槽是 single 槽，同 priority 二次注册会直接抛错（`single slot
 * "...already has a registration at priority N"`），且「lowest renders」。所以必须
 * 显式给一个足够低的 priority：
 * - 动态包（plugin_manager 运行时加载）本来会被框架改写成递减的 priority，显式值
 *   会被覆盖，写了也无副作用；
 * - 但用 `dsh plugin add` 装进 `dsh.profile.bundles` 的是**静态 bundle**，走普通
 *   ctx，没人分配 priority → 默认 0，与 dsh-connect-trae（0）撞车直接抛错，组件
 *   根本不渲染。这是首次安装踩到的坑。
 * PRIORITY = -100 低于 workbuddy 的 -0.5 与 trae / 宿主 label 的 0，必定胜出。
 * 代价是它们附带的促销角标 / 负载图标 / 新品标记不再显示；模型名里的
 * ` · x<倍率>` 是写进 name 的，会原样保留。
 *
 * 注意 id 必须与 cordis.patch.yml 里的 insert id 一致，否则 ModuleLoader 报
 * "loaded without registering <id>"。
 */
window.__ModuleLoader__.load({
  id: 'dsh-model-group',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    const SEPARATOR = ' · '
    const ROW_ATTRIBUTE = 'data-dsh-model-group-row'

    // 这一行要跟浮框里真正的 cell 行（Model / Effort）对齐，所以直接照抄实测值：
    // 行高 34px、左右 padding 8px、gap 6px、字号 13px / 行高 20px。
    // 右侧值的右边缘与 cellValue 的右边缘重合 —— cell 里值后面还有 6px gap 和
    // 12px 的箭头图标，所以这里用 marginRight: 18px 让出同样的位置。
    const ROW_STYLE = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      height: '34px',
      padding: '0 8px',
      fontSize: '13px',
      lineHeight: '20px',
      pointerEvents: 'none',
      userSelect: 'none',
    }
    const ROW_LABEL_STYLE = {
      flex: '0 0 auto',
      color: 'var(--dsw-alias-label-primary, rgb(237, 240, 247))',
    }
    const ROW_VALUE_STYLE = {
      flex: '0 1 auto',
      marginLeft: 'auto',
      marginRight: '18px',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      color: 'var(--dsw-alias-label-tertiary, rgb(161, 164, 170))',
    }

    // 左栏标签文案。宿主 UI 是英文（Model / Effort），这里跟着对齐。
    const ROW_LABELS = {
      zh: '分组',
      default: 'Group',
    }

    const PROVIDER_STYLE = {
      color: 'var(--dsw-alias-label-secondary)',
    }

    /**
     * 把分组名行同步进浮框 surface，返回插入的节点（供卸载时清理）。
     * 只在 `menu` placement（根面板的 Model 行）调用，此时组件就在 surface 里。
     *
     * surface 是复用的：从根面板切进模型列表时，同一个容器只是换了 role 和内容，
     * 我们手动插的节点不会跟着 React 一起消失，所以必须由调用方在卸载时 remove。
     */
    function syncGroupRow(hostNode, providerName) {
      if (!hostNode || providerName === '') return null
      const surface = hostNode.closest('[role="menu"]')
      if (!surface) return null

      let row = surface.querySelector('[' + ROW_ATTRIBUTE + ']')
      if (!row) {
        row = document.createElement('div')
        row.setAttribute(ROW_ATTRIBUTE, '')
        Object.assign(row.style, ROW_STYLE)

        // 左右两栏，与下面 Model / Effort 行同构：左边标签、右边值。
        const label = document.createElement('span')
        Object.assign(label.style, ROW_LABEL_STYLE)
        const value = document.createElement('span')
        Object.assign(value.style, ROW_VALUE_STYLE)

        row.appendChild(label)
        row.appendChild(value)

        // 浮框第一个子节点是背景材质层（div），第一个 button 才是 Model 行，
        // 插在它前面就是「Model 之上」。
        const firstCell = surface.querySelector('button')
        if (firstCell) surface.insertBefore(row, firstCell)
        else surface.appendChild(row)
      }

      // 左栏文案跟着界面语言走：宿主 UI 目前是英文，中文界面给中文。
      // lang 可能是 `zh-CN` / `zh-Hans-CN` 这类大小写混合的标签，先归一化。
      const lang = (document.documentElement.lang || '').toLowerCase()
      const labelText =
        ROW_LABELS[lang] || ROW_LABELS[lang.split('-')[0]] || ROW_LABELS.default
      const [labelNode, valueNode] = row.children
      if (labelNode.textContent !== labelText) labelNode.textContent = labelText
      if (valueNode.textContent !== providerName) valueNode.textContent = providerName
      if (valueNode.getAttribute('title') !== providerName) {
        valueNode.setAttribute('title', providerName)
      }
      return row
    }

    /**
     * 渲染模型名。
     *
     * - `trigger`（composer 触发按钮）：单行，`分组 · 模型`；
     * - `menu`（浮框根面板的 "Model" 行）：**只渲染模型名**，分组名交给
     *   syncGroupRow 在 surface 顶部单独占一行（不可点击）；
     * - `option`（浮框里的模型列表）：不加，那里每个分组上方已经有 MenuGroup
     *   标题（就是 provider.name），每行再重复一遍是噪音。
     */
    function ModelGroupLabel(props) {
      const provider = props.provider
      const model = props.model
      const placement = props.placement

      const modelName = typeof model?.name === 'string' ? model.name : ''
      const providerName =
        typeof provider?.name === 'string' ? provider.name.trim() : ''

      const isMenu = placement === 'menu'
      const hostRef = React.useRef(null)

      // 布局副作用：DOM 已提交，surface 与 button 都在，才能定位插入点。
      // 卸载时移除自己插的节点，否则切进模型列表后那行会滞留在列表顶部
      // （列表里每个分组本来就有 MenuGroup 标题，重复显示）。
      React.useLayoutEffect(() => {
        if (!isMenu) return undefined
        const row = syncGroupRow(hostRef.current, providerName)
        return () => {
          if (row && row.parentNode) row.parentNode.removeChild(row)
        }
      }, [isMenu, providerName])

      if (providerName === '' || placement !== 'trigger') {
        return h('span', { ref: hostRef, children: modelName })
      }

      return h(
        'span',
        { ref: hostRef, title: providerName },
        h('span', { style: PROVIDER_STYLE, children: providerName }),
        h('span', { style: { opacity: 0.55 }, children: SEPARATOR }),
        h('span', { children: modelName }),
      )
    }

    const inject = ['slots']

    /**
     * single 槽是「lowest renders」，同 priority 二次注册直接抛错。静态 bundle
     * （`dsh plugin add` 进 profile bundles）不会像动态包那样被框架改写 priority，
     * 默认 0 会与 dsh-connect-trae 撞车，所以显式压到 -100。
     */
    const PRIORITY = -100

    function apply(ctx) {
      // inject 的回调返回 disposer；槽未挂载时 inject 会等它挂上再执行。
      ctx.slots.inject('conversation.input.model.label', () =>
        ctx.slots.register(
          { name: 'conversation.input.model.label', priority: PRIORITY },
          ModelGroupLabel,
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
