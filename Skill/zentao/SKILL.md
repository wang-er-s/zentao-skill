---
name: zentao
description: 使用本技能目录下的 scripts/zentao.js 查询禅道用户、产品、模块和需求信息，并执行需求指派、关闭等操作。默认输出 JSON，适合脚本或 Agent 调用。
---

# 禅道技能

统一使用 [scripts/zentao.js](./scripts/zentao.js)。

## 执行原则

- 优先使用 `node ./scripts/zentao.js <resource> <action>`。
- 默认输出 JSON，不需要额外加 `--json`。
- 默认配置文件路径为 `~/.zentao/config.json`。
- 如果用户还没登录，先执行 `user login`。
- `story assign` 优先复用本地 token/账号自动生成网页 Cookie。
- `story close` 走 v1 接口。

## 常用命令

登录：

```bash
node ./scripts/zentao.js user login --url http://你的禅道地址 --account 用户名 --password 密码
```

查看当前用户：

```bash
node ./scripts/zentao.js user whoami
```

列出产品：

```bash
node ./scripts/zentao.js product list
```

查看单个产品：

```bash
node ./scripts/zentao.js product get 1
```

列出模块：

```bash
node ./scripts/zentao.js module list --product-id 1
```

查询需求：

```bash
node ./scripts/zentao.js story list --product-id 1
```

按模块筛选需求：

```bash
node ./scripts/zentao.js story list --product-id 1 --module-id 131
```

按指派人筛选需求：

```bash
node ./scripts/zentao.js story list --product-id 1 --assigned-to zhangsan
```

只看当前用户：

```bash
node ./scripts/zentao.js story list --product-id 1 --mine
```

查看需求详情：

```bash
node ./scripts/zentao.js story get 123
```

指派需求：

```bash
node ./scripts/zentao.js story assign 123 --to zhangsan --comment "已完成"
```

关闭需求：

```bash
node ./scripts/zentao.js story close 123 --reason done --comment "已完成"
```
