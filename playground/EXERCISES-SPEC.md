# SQL 操练场数据规范

本文件约束两个文件：

- `playground/shop-schema.sql`：电商示例库的建表 + 种子数据（MySQL 8.0 语法）。
- `playground/exercises.json`：练习清单（每个练习的题目、提示、参考答案、判题规则与关联知识点）。

## 1. shop-schema.sql

- 只写 `CREATE TABLE`、`INSERT` 语句，不写 `CREATE DATABASE` / `USE`（运行时会自动建库）。
- **不要**在 DDL 里使用：外键约束 `FOREIGN KEY`、`ON UPDATE CURRENT_TIMESTAMP`、表级 `KEY`/`INDEX` 定义、`COMMENT`、分区。示例库是教学用，运行时用兼容内核执行，外键与表级索引请在讲解里说明、不要写进 SQL。
- 可以且鼓励使用：`AUTO_INCREMENT`、`PRIMARY KEY`、`UNIQUE`、`NOT NULL`、`DEFAULT CURRENT_TIMESTAMP`、`DECIMAL(10,2)`、`DATETIME`、`VARCHAR(n)`、`INT`、`TINYINT`、`TEXT`、`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`。
- 表结构固定为（7 张表，字段名不得随意改动，练习和知识点都依赖它）：

| 表 | 字段 |
| --- | --- |
| `users` | id, name, phone, city, created_at |
| `categories` | id, name, parent_id |
| `products` | id, category_id, name, price, stock, on_sale |
| `orders` | id, user_id, status, total_amount, created_at |
| `order_items` | id, order_id, product_id, quantity, unit_price |
| `payments` | id, order_id, method, amount, paid_at |
| `inventory` | product_id, stock, updated_at |

- `orders.status` 取值用 `paid` / `pending` / `cancelled` / `refunded`；`payments.method` 用 `alipay` / `wechat` / `card`。
- 种子数据规模建议：`users` 10 行、`categories` 8 行（含父子层级，root 的 parent_id 为 0）、`products` 15 行（部分下架、价格覆盖 9.9~9999）、`orders` 24 行（不同用户、不同状态、时间分布在最近 90 天）、`order_items` 约 40 行、`payments` 约 15 行、`inventory` 15 行（含低库存）。
- 数据要「像真的」：有重复用户、有沉默用户（没有订单，用于 LEFT JOIN 练习）、有从未被购买的商品、有超过 2 件商品的订单，能支撑「找出没有订单的用户」「每个分类的销售额」「复购用户」等题目。
- 语句之间用空行分隔，文件最后一行是分号。

## 2. exercises.json

```json
{
  "titleZh": "SQL 操练场",
  "intro": "左侧是电商示例库和练习目录，右侧写 SQL、点运行就能看到真实结果。题目会自动判对错，卡住可以看提示和参考答案。",
  "database": {
    "name": "shop",
    "titleZh": "电商示例库",
    "description": "7 张表：用户、分类、商品、订单、订单项、支付、库存。练习都基于它，点「重置数据库」可恢复初始数据。"
  },
  "stages": [
    { "id": "basics", "titleZh": "基础查询", "description": "SELECT / WHERE / ORDER BY / LIMIT，先学会把数据查出来。" },
    { "id": "join", "titleZh": "多表查询", "description": "JOIN、子查询：数据分散在多张表里，要学会拼起来。" },
    { "id": "aggregate", "titleZh": "聚合与进阶", "description": "GROUP BY、HAVING、窗口函数、CASE WHEN，学会做统计与分析。" },
    { "id": "dml", "titleZh": "建表与写入", "description": "CREATE TABLE、INSERT、UPDATE、DELETE，把数据管起来。" },
    { "id": "transaction", "titleZh": "事务与优化", "description": "事务、锁与 EXPLAIN，处理并发和性能问题。" }
  ],
  "exercises": [
    {
      "id": "b1",
      "stageId": "basics",
      "titleZh": "查出所有上架商品",
      "goal": "用 SELECT 取出商品名与价格，只保留上架商品，并按价格从高到低排序。",
      "prompt": "查询 products 表里 on_sale = 1 的商品，返回 name、price 两列，按 price 降序排列。",
      "hint": "SELECT 列名 FROM 表 WHERE 条件 ORDER BY 价格 DESC;",
      "starterSql": "SELECT\n  -- 在这里写你的查询\nFROM products;",
      "solutionSql": "SELECT name, price\nFROM products\nWHERE on_sale = 1\nORDER BY price DESC;",
      "check": { "mode": "result", "orderSensitive": true },
      "difficulty": 1,
      "minutes": 5,
      "pageIds": ["select-basics", "where-filter", "order-limit"]
    }
  ]
}
```

### 字段与判题

- `id`：`<stage 前缀><数字>`，例如 `b1`…`b6`、`j1`…`j5`、`a1`…`a5`、`d1`…`d4`、`t1`…`t3`，全局唯一。
- `stageId`：必须出现在 `stages` 里。
- `titleZh` / `goal` / `prompt`：titleZh 一句话；goal 讲「练到什么」；prompt 是精确任务（返回哪些列、是否排序、是否去重）。
- `hint`：一两步提示，不直接给答案。
- `starterSql`：编辑器初始 SQL，包含 `-- 在这里写你的查询` 占位注释。
- `solutionSql`：**必须正确**、能在示例库上跑通、结果稳定。
- `check`：
  - `{ "mode": "result", "orderSensitive": true|false }`（默认）：分别用「用户 SQL」和「参考答案」在全新种子库上执行，比较**最后一条查询**的结果集（列顺序、值都要一致）；`orderSensitive: true` 时行顺序也要一致。
  - `{ "mode": "verify", "verifySql": "SELECT ..." }`：先执行用户 SQL（写入类），再执行 verifySql 取结果；参考答案用 solutionSql + verifySql。用于 INSERT / UPDATE / DELETE / 事务练习。
  - `{ "mode": "schema", "table": "product_reviews", "columns": ["id","product_id","rating","comment","created_at"] }`：执行用户 SQL 后，检查该表存在且包含这些列（按顺序包含即可，多出的列允许）。用于建表练习。
- `difficulty` 1~4；`minutes` 3~20；`pageIds` 1~4 个 manifest 页面 id（必须存在）。
- 每题只考一个明确能力，题干要写清「返回什么列、要不要排序、要不要去重」，否则判题会产生歧义。

### 练习覆盖（24 题）

- basics 6 题：条件筛选、排序 + LIMIT、去重、NULL、计算列、简单聚合。
- join 5 题：INNER JOIN（订单+订单项+商品）、LEFT JOIN（沉默用户 / 无销量商品）、自连接（分类层级）、多表聚合（分类销售额）、子查询（高于均价的商品）。
- aggregate 5 题：GROUP BY + HAVING（复购用户）、COUNT DISTINCT、CASE WHEN 分档、日期函数按月统计、窗口函数排名（每用户消费额排名）。
- dml 4 题：建表（schema 判题）、多行 INSERT、UPDATE（verify 判题）、DELETE（verify 判题）。
- transaction 4 题：事务原子性（START TRANSACTION / ROLLBACK 后 verify）、条件更新防超卖（verify）、乐观锁版本号（verify）、EXPLAIN 判断索引（result 判题，对比 EXPLAIN 结果——用普通 SELECT 判题即可，避免依赖执行计划格式）。
- 每题都关联 1~3 个 manifest 页面 id，方便「看讲解 → 立刻练」。
