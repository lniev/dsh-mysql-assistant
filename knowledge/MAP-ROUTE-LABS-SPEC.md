# 知识地图 / 学习路线 / 企业实战数据规范

本文件约束 `knowledge/map.json`、`knowledge/learning-route.json`、`knowledge/labs.json` 三个文件。
基础词汇：页面 id 一律来自 `knowledge/manifest.json` 的 `pages`（83 个），校验脚本会检查引用是否合法。

## 1. knowledge/map.json（知识地图）

```json
{
  "titleZh": "MySQL 知识地图",
  "intro": "83 个知识点按依赖关系排成五层：先建立直觉，再练 SQL，然后学设计与优化，最后进入生产架构与企业实战。点击任意节点查看通俗讲解。",
  "layers": [
    { "id": "foundation", "titleZh": "① 建立直觉", "description": "MySQL 是什么、SQL 怎么跑、表怎么存。" },
    { "id": "sql", "titleZh": "② SQL 能力", "description": "查询、聚合、多表与表设计。" },
    { "id": "optimize", "titleZh": "③ 设计与优化", "description": "索引、执行计划、事务与锁。" },
    { "id": "production", "titleZh": "④ 生产与架构", "description": "复制、分库分表、备份、权限与安全。" },
    { "id": "enterprise", "titleZh": "⑤ 企业实战", "description": "电商、库存、订单、报表等真实场景。" }
  ],
  "nodes": [
    { "pageId": "what-is-mysql", "deps": [], "tag": "必读" },
    { "pageId": "select-basics", "deps": ["what-is-mysql"], "tag": "基础" }
  ],
  "paths": [
    { "id": "quickstart", "titleZh": "7 天 SQL 入门", "description": "只学最常用的查询与写入，一周能独立查数据。", "pageIds": ["what-is-mysql", "select-basics", "where-filter", "order-limit", "aggregate-functions", "group-by", "insert"] }
  ]
}
```

要求：

- `nodes` 必须**恰好覆盖 manifest 的 83 个页面各一次**，不得重复、不得遗漏、不得引用不存在的 id。
- `deps` 是「前置知识」，2~5 个以内，必须也是页面 id；整体必须是**有向无环图**（不能出现 A→B→A）。
- `layers` 的 id 必须使用 manifest 里已有的五层 id（foundation / sql / optimize / production / enterprise），节点所属层由 manifest 决定，`nodes` 里不用写 layer。
- `tag` 是 2~4 个字的标签，例如「必读」「基础」「进阶」「高频」「面试常考」「实战」「容易错」。
- `paths` 给 3~5 条推荐路线，每条 5~12 个页面 id，覆盖不同目标（入门 / 求职面试 / 后端开发 / 运维 / 企业实战）。

## 2. knowledge/learning-route.json（学习路线）

```json
{
  "titleZh": "MySQL 学习路线",
  "intro": "面向想系统掌握 MySQL、能独立负责线上数据库的工程师：先建立直觉，再练 SQL 与表设计，然后进入索引、事务、架构与安全，最后用企业实战串起来。每项都有交付物和验收标准，勾选记录进度。",
  "totalHours": 100,
  "tracks": [
    { "id": "backend", "titleZh": "后端开发主线", "description": "从零到能独立设计并优化业务库。", "stageIds": ["s1", "s2", "s3", "s4", "s5", "s6"] },
    { "id": "fast", "titleZh": "有 SQL 基础速通", "description": "跳过基础语法，直攻索引、事务与架构。", "stageIds": ["s3", "s4", "s5", "s6"] }
  ],
  "stages": [
    {
      "id": "s1",
      "title": "Stage 1 · 建立直觉与第一条查询",
      "titleZh": "建立直觉与第一条查询",
      "weeks": "第 1 周",
      "goal": "知道 MySQL 由哪几层组成、一条查询怎么被处理，能连上数据库写出第一条 SELECT。",
      "hours": 8,
      "items": [
        {
          "id": "s1-1",
          "title": "认识 MySQL 与它的分层架构",
          "goal": "用自己的话讲清连接层、服务层、存储引擎层各自负责什么。",
          "points": ["MySQL 的定位与常见使用场景", "连接层 / Server 层 / 存储引擎层的职责"],
          "deliverable": "一张手绘的 MySQL 架构图 + 100 字说明",
          "accept": "能向同事解释「客户端到磁盘之间发生了什么」",
          "minutes": 60,
          "level": "L1",
          "pageIds": ["what-is-mysql", "architecture"],
          "practice": "在知识地图里依次点开这两页，把「一条 SQL 的执行旅程」用自己的话复述一遍。"
        }
      ]
    }
  ],
  "checkpoints": [
    { "title": "能独立查数据", "description": "给你一张陌生表结构，能在 10 分钟内写出正确的多表统计查询。" }
  ]
}
```

要求：

- 6~7 个 stage，合计 30~40 个 item；每个 stage 有 `goal` 和 `hours`。
- 每个 item 的 `pageIds` 引用 manifest 页面（1~4 个），覆盖该阶段知识。
- item 的 `practice` 必须指向可执行动作（去知识地图看哪几页 / 去 SQL 操练场做哪类题 / 建表跑一遍）。
- 阶段难度递进：L1 → L4，`minutes` 合计与 `hours` 大致匹配。
- `tracks` 至少 2 条，`stageIds` 必须是本文件里存在的 stage id。
- `checkpoints` 6~7 条，写可验证的验收标准。

## 3. knowledge/labs.json（企业级实战）

```json
{
  "titleZh": "企业级实战",
  "intro": "把知识地图里的知识放进真实业务：每个实战都从业务背景出发，给你可直接执行的 SQL、上线检查清单和踩坑提示。建议在 SQL 操练场边做边验。",
  "scenarios": [
    {
      "id": "order-modeling",
      "titleZh": "电商订单库建模",
      "level": "L2",
      "hours": 3,
      "tags": ["表设计", "电商"],
      "background": "公司要做一个小型电商，第一件事是把用户、商品、订单、支付、库存的表设计出来。设计不好，后面查询、对账、扩展都会返工。",
      "goal": "设计出满足三范式、能支撑订单查询与对账的核心表，并写清索引与约束。",
      "steps": [
        { "title": "先画关系图", "detail": "用户 1:N 订单，订单 1:N 订单项，商品 1:N 订单项，订单 1:1 支付，商品 1:1 库存。关系定了，表结构自然就出来了。", "sql": "" },
        { "title": "创建用户与商品表", "detail": "金额用 DECIMAL(10,2)，手机号加唯一索引，商品记录分类与上下架状态。", "sql": "CREATE TABLE users (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50) NOT NULL, phone VARCHAR(20) NOT NULL UNIQUE, city VARCHAR(50), created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;" }
      ],
      "deliverable": "一份可执行的建表 SQL + 关系说明 + 索引清单",
      "checklist": ["金额字段是否都是 DECIMAL(10,2)", "订单号是否有唯一约束", "高频查询是否有索引"],
      "pitfalls": ["把金额存成 FLOAT，出现 0.1+0.2 精度问题", "订单表不存冗余金额，对账时反复关联"],
      "pageIds": ["create-table", "primary-key", "foreign-key", "ecommerce-schema"]
    }
  ]
}
```

要求：

- 8 个 scenario，id 用英文短横线；`level` 取 L1~L4；`hours` 1~5；`tags` 2~3 个。
- `steps` 3~6 个；每个 step 的 `sql` 可以为空字符串，但只要有 SQL 就必须是 MySQL 8.0 可执行语句（建表 / 查询 / 事务），并在 detail 里说明它验证什么。
- 覆盖：建模、查询与分页、索引优化、事务与库存、订单幂等、报表统计、主从/读写分离、分库分表或数据迁移。
- `checklist` 4~6 条，`pitfalls` 2~4 条，`pageIds` 2~5 个 manifest 页面 id。
- 语言同样要求通俗：业务背景讲清楚，步骤像同事带你做。

## 4. 校验

```bash
node scripts/validate-content.mjs
```
