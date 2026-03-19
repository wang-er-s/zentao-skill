# Zentao CLI

一个基于 TypeScript 的禅道命令行工具，命令结构统一为“资源 + 动作”，默认输出 JSON，并且可以直接打包成可拷贝的 skill 目录。

## 安装与运行

安装依赖：

```bash
npm install
```

开发模式：

```bash
npm run help
```

构建 skill：

```bash
npm run build
```

构建产物：

```bash
Skill/zentao/
  SKILL.md
  scripts/zentao.js
```

构建后运行：

```bash
node Skill/zentao/scripts/zentao.js help
```

## 命令

登录并保存配置：

```bash
zentao user login --url http://你的禅道地址 --account 用户名 --password 密码
```

查看当前用户：

```bash
zentao user whoami
```

列出产品：

```bash
zentao product list
```

查看单个产品：

```bash
zentao product get 1
```

列出模块：

```bash
zentao module list --product-id 1
```

查询需求：

```bash
zentao story list --product-id 1
```

按模块筛选需求：

```bash
zentao story list --product-id 1 --module-id 131
```

按指派人筛选需求：

```bash
zentao story list --product-id 1 --assigned-to zhangsan
```

只看当前用户的需求：

```bash
zentao story list --product-id 1 --mine
```

查看单条需求详情：

```bash
zentao story get 123
```

指派需求：

```bash
zentao story assign 123 --to zhangsan --comment "已完成"
```

关闭需求：

```bash
zentao story close 123 --reason done --comment "已完成"
```

## 配置

默认配置文件路径：

```text
~/.zentao/config.json
```

如需覆盖，可以为任意命令传：

```bash
--config-path /path/to/config.json
```

## 目录

```text
src/
  cli/
  commands/
  services/
  lib/

Skill/
  zentao/
    SKILL.md
    scripts/
      zentao.js
```
