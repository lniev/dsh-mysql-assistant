# MySQL 知识库内容写作规范（AUTHORING SPEC）

本文件是 `knowledge/pages/*.json` 的唯一格式与文风标准。写之前先读一遍；写完必须通过校验命令。

## 1. 文件与清单

- 全部知识点清单是 `knowledge/manifest.json` 的 `pages` 数组（83 页，含 id / chapter / titleZh / title / difficulty / minutes）。
- **每个知识点一个文件**：`knowledge/pages/<chapter>/<id>.json`（例如 `knowledge/pages/sql-basics/where-filter.json`），文件名必须与 `id` 完全一致。
- `id`、`chapter`、`titleZh`、`title`、`difficulty`、`minutes` 必须与 manifest 一致（缺失时 build 脚本会用 manifest 补齐，但 titleZh 建议在页面文件里也写一遍）。
- `related` 里引用的页面 id 必须存在于 manifest，且不要引用自己。
- 章节标题与章节顺序由 manifest 决定，页面文件不需要写章节结构。

## 2. 单个页面 JSON 结构

```json
{
  "id": "where-filter",
  "titleZh": "WHERE：按条件筛选",
  "title": "WHERE filter",
  "chapter": "sql-basics",
  "difficulty": 1,
  "minutes": 15,
  "summary": "WHERE 是 SQL 的「筛子」：把表里所有行倒进去，只留下满足条件的行。比如从 10 万条订单里只用一句 WHERE 就捞出最近 7 天已支付的订单。它不改变表结构，也不改变数据，只是决定这次查询看哪些行。",
  "sections": [
    { "heading": "一句话理解", "text": "把 WHERE 想成快递站的分拣线：SELECT 决定你拿哪几列，WHERE 决定哪些行能通过。先筛行，再选列、再排序，是 SQL 的固定顺序。" },
    { "heading": "常用条件写法", "text": "比较 = < > <= >=、范围 BETWEEN、集合 IN、模糊 LIKE、空值 IS NULL、组合 AND / OR / NOT。写 OR 时记得加括号，否则 AND 的优先级会把条件拆错。" },
    { "heading": "执行顺序", "text": "FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。WHERE 在 SELECT 之前执行，所以 WHERE 里不能使用 SELECT 里定义的列别名。" }
  ],
  "keyPoints": [
    "WHERE 过滤的是「行」，SELECT 决定的是「列」。",
    "字符串和日期要用单引号：WHERE status = 'paid'。",
    "判断 NULL 必须用 IS NULL / IS NOT NULL，不能用 = NULL。",
    "LIKE 的 % 是任意多个字符，_ 是一个字符；以 % 开头通常用不上索引。"
  ],
  "snippets": [
    { "title": "基础条件筛选", "lang": "sql", "code": "SELECT id, user_id, amount\nFROM orders\nWHERE status = 'paid'\n  AND amount >= 100\n  AND created_at >= '2026-01-01';" },
    { "title": "OR 一定要加括号", "lang": "sql", "code": "SELECT id FROM orders\nWHERE status = 'paid'\n  AND (channel = 'app' OR channel = 'web');" }
  ],
  "pitfalls": [
    "WHERE 里写 amount = NULL 永远查不到数据，必须用 IS NULL。",
    "在索引列上套函数（WHERE DATE(created_at) = '2026-01-01'）会让索引失效，改成范围条件。",
    "OR 混用时不加括号，条件优先级容易写错，查出来的数据「多了一块」。"
  ],
  "enterprise": "线上排查问题时，先在 WHERE 里写全过滤条件，再补 ORDER BY / LIMIT，避免全表扫描；对高频过滤字段建索引，并注意「以 % 开头的 LIKE」和「函数包列」这两类索引失效写法。"
}
```

字段要求：

| 字段 | 要求 |
| --- | --- |
| `summary` | 60–220 字。**第一句必须是人话 + 生活化比喻**，再说它解决什么问题，最后给一个具体场景。不要只复述定义。 |
| `sections` | 2–5 个，每个 `{heading, text}`；text 80–260 字。heading 用「一句话理解」「为什么需要」「怎么写」「执行顺序」「和 XX 的区别」这类口语化小标题。 |
| `keyPoints` | 3–6 条，每条一句话，能直接当笔记背。 |
| `snippets` | 1–3 个，`lang` 固定 `"sql"`；代码必须是**可直接在 MySQL 8.0 执行**的示例（带 FROM 表名、带分号），不要伪代码。示例里的表名/字段名尽量和电商示例库（users/products/orders/order_items/categories/payments/inventory）一致。 |
| `pitfalls` | 2–4 条，写「初学者最容易错在哪」，每条说清错误写法和正确写法。 |
| `enterprise` | 40–200 字，说明这条知识在企业里怎么落地、什么场景必须注意什么。 |
| `related` | 2–5 个页面 id，从 manifest 选，形成知识网络。 |

可选字段：`docUrl`（MySQL 官方文档链接，如 `https://dev.mysql.com/doc/refman/8.0/en/select.html`），不是必填。

## 3. 文风要求（最重要）

读者是「想学 MySQL、但可能只写过一点点 SQL」的工程师。目标是**通俗易懂**，不是写百科全书。

1. **先比喻，后术语**：每个概念先用生活场景解释，再出现术语。例如「索引像书的目录」「事务像转账必须同时成功」「回表像查目录后再去书架翻书」。
2. **讲清「为什么」再讲「怎么写」**：一句话说明没有它会怎样（全表扫描、超卖、数据错乱），读者才有动力记。
3. **每个术语第一次出现必须解释**，不要堆缩写（MVCC、B+ 树、binlog 第一次出现要有一句人话解释）。
4. **短句、口语、少用「综上所述」**。可以用「你可以把它想成…」「注意这里有个坑」。
5. **示例具体**：给表名、字段、真实一点的数据（订单金额、商品分类），不要 `table1/column1`。
6. **数据一致性**：页面里的数字、结论、SQL 行为必须正确，不确定的写法宁可不写。
7. 不要出现「本文」「本页」「如上所述」这类文档腔；直接讲内容。

## 4. SQL 示例约定

- 目标方言：**MySQL 8.0**。标识符不加反引号（除关键字冲突），语句结尾带分号。
- 示例默认基于电商示例库：

  - `users(id, name, phone, city, created_at)`
  - `categories(id, name, parent_id)`
  - `products(id, category_id, name, price, stock, on_sale)`
  - `orders(id, user_id, status, total_amount, created_at)`
  - `order_items(id, order_id, product_id, quantity, unit_price)`
  - `payments(id, order_id, method, amount, paid_at)`
  - `inventory(product_id, stock, updated_at)`

  用到这些表时表名可直接写；如果示例需要别的表，先一句说明「假设有张表 …」。
- 涉及执行计划的示例，用 `EXPLAIN SELECT ...`。
- 不要写需要真实数据才有意义却没有数据说明的 SQL（读者要能脑补出表结构）。

## 5. 校验

在插件根目录执行：

```bash
node scripts/validate-content.mjs --only pages --chapter <你的章节 id>
```

去掉 `--chapter` 会检查全部内容。它会检查：每个 manifest 页面是否都有文件、字段是否齐全、字数是否在范围内、related 是否存在、snippets 的 lang 是否为 sql 等。先修到 0 error 再交付。

## 6. 分工

| 目录/章节 | 负责人 |
| --- | --- |
| `start`（8 页）、`sql-basics`（16 页） | kb-core |
| `table-design`（12 页）、`index`（12 页） | kb-sql |
| `transaction`（10 页）、`architecture`（9 页） | kb-adv |
| `ops-security`（8 页）、`enterprise`（8 页） | kb-ops |
| `knowledge/map.json`、`learning-route.json`、`labs.json` | route-labs |
| `playground/*` | sql-exercises |
