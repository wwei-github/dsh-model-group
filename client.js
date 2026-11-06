/**
 * dsh-model-group — 客户端半边。
 *
 * 作用：在 composer 触发按钮上，把模型名前面补上它所属的分组（provider）名，
 * 变成 `Trae · DeepSeek-V4.1-Flash · x0.09`。
 *
 * 为什么只能这么做：picker 把模型名当纯字符串渲染，宿主只为这一处开了口子 ——
 * `conversation.input.model.label` 槽，契约是「渲染非交互的内联内容（彩色名称/角标）」，
 * 点击、焦点、勾选、无障碍文案仍归 picker 自己。分组名就在 props 里：
 * `provider: { id, name }`，`name` 是用户在设置里看到的分组显示名。
 *
 * 覆盖关系：该槽是 single 槽，同 priority 二次注册会抛错；动态包的 priority 由
 * 框架自动分配且「越晚注册越低」，所以本插件会盖掉 dsh-connect-workbuddy（-0.5）
 * 与 dsh-connect-trae（0）的 label。代价是它们附带的促销角标 / 负载图标 /
 * 新品标记不再显示；模型名里的 ` · x<倍率>` 是写进 name 的，会原样保留。
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

    /**
     * 渲染模型名（必要时带分组前缀）。
     *
     * 只在 `placement === 'trigger'` 时加前缀：picker 的菜单里模型本来就按分组
     * 分栏显示，每行再重复一遍分组名是噪音；触发按钮上只有一行字，没有分栏可依。
     */
    function ModelGroupLabel(props) {
      const provider = props.provider
      const model = props.model
      const placement = props.placement

      const modelName = typeof model?.name === 'string' ? model.name : ''
      const providerName =
        typeof provider?.name === 'string' ? provider.name.trim() : ''

      if (providerName === '' || placement !== 'trigger') {
        return h('span', { children: modelName })
      }

      return h(
        'span',
        { title: providerName },
        h('span', {
          style: { color: 'var(--dsw-alias-label-secondary)' },
          children: providerName,
        }),
        h('span', { style: { opacity: 0.55 }, children: SEPARATOR }),
        h('span', { children: modelName }),
      )
    }

    const inject = ['slots']

    function apply(ctx) {
      // inject 的回调返回 disposer；槽未挂载时 inject 会等它挂上再执行。
      ctx.slots.inject('conversation.input.model.label', () =>
        ctx.slots.register(
          { name: 'conversation.input.model.label' },
          ModelGroupLabel,
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
