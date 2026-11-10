CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  city VARCHAR(50) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  parent_id INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE products (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  on_sale TINYINT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE order_items (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  method VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory (
  product_id INT NOT NULL PRIMARY KEY,
  stock INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (id, name, phone, city, created_at) VALUES
  (1, '张伟', '13800000001', '北京', '2026-01-12 10:20:00'),
  (2, '李娜', '13800000002', '上海', '2026-01-20 09:10:00'),
  (3, '王芳', '13800000003', '广州', '2026-02-05 14:30:00'),
  (4, '刘强', '13800000004', '深圳', '2026-02-18 16:45:00'),
  (5, '陈静', '13800000005', '杭州', '2026-03-02 11:05:00'),
  (6, '杨波', '13800000006', '成都', '2026-03-15 20:00:00'),
  (7, '赵敏', '13800000007', NULL, '2026-04-01 08:30:00'),
  (8, '周涛', '13800000008', '武汉', '2026-05-10 13:15:00'),
  (9, '吴梅', '13800000009', '南京', '2026-06-22 19:40:00'),
  (10, '徐亮', '13800000010', '西安', '2026-07-08 15:55:00');

INSERT INTO categories (id, name, parent_id) VALUES
  (1, '服装', 0),
  (2, '数码', 0),
  (3, '家居', 0),
  (4, '男装', 1),
  (5, '女装', 1),
  (6, '手机', 2),
  (7, '电脑', 2),
  (8, '厨具', 3);

INSERT INTO products (id, category_id, name, price, stock, on_sale) VALUES
  (1, 1, '基础白T恤', 59.00, 120, 1),
  (2, 4, '商务衬衫', 199.00, 60, 1),
  (3, 4, '休闲夹克', 499.00, 25, 1),
  (4, 5, '碎花连衣裙', 329.00, 40, 1),
  (5, 5, '针织开衫', 259.00, 35, 1),
  (6, 6, '旗舰手机 Pro', 6999.00, 15, 1),
  (7, 6, '入门手机', 1999.00, 50, 1),
  (8, 7, '轻薄笔记本', 9999.00, 8, 1),
  (9, 7, '机械键盘', 399.00, 80, 1),
  (10, 2, '降噪耳机', 899.00, 45, 1),
  (11, 8, '不粘锅', 159.00, 70, 1),
  (12, 3, '香薰蜡烛', 9.90, 200, 1),
  (13, 1, '运动袜', 19.90, 0, 0),
  (14, 3, '抱枕', 79.00, 30, 0),
  (15, 8, '陶瓷餐具套装', 129.00, 20, 1);

INSERT INTO orders (id, user_id, status, total_amount, created_at) VALUES
  (1, 1, 'paid', 127.90, '2026-08-12 10:15:00'),
  (2, 2, 'paid', 6999.00, '2026-08-15 14:20:00'),
  (3, 1, 'paid', 898.00, '2026-08-20 09:05:00'),
  (4, 3, 'pending', 329.00, '2026-08-22 18:40:00'),
  (5, 4, 'cancelled', 2008.90, '2026-08-25 11:30:00'),
  (6, 5, 'paid', 398.00, '2026-08-28 16:10:00'),
  (7, 2, 'paid', 899.00, '2026-09-02 10:00:00'),
  (8, 6, 'refunded', 9999.00, '2026-09-05 13:25:00'),
  (9, 3, 'paid', 88.70, '2026-09-08 20:15:00'),
  (10, 4, 'paid', 168.90, '2026-09-12 09:45:00'),
  (11, 1, 'pending', 199.00, '2026-09-15 15:35:00'),
  (12, 7, 'paid', 268.90, '2026-09-18 11:55:00'),
  (13, 5, 'paid', 7898.00, '2026-09-22 17:20:00'),
  (14, 2, 'cancelled', 588.00, '2026-09-26 10:05:00'),
  (15, 3, 'paid', 798.00, '2026-10-01 08:50:00'),
  (16, 1, 'paid', 2917.80, '2026-10-05 19:30:00'),
  (17, 4, 'refunded', 499.00, '2026-10-09 14:15:00'),
  (18, 6, 'paid', 186.90, '2026-10-12 10:40:00'),
  (19, 5, 'paid', 337.80, '2026-10-18 16:00:00'),
  (20, 7, 'pending', 528.00, '2026-10-24 09:20:00'),
  (21, 2, 'paid', 259.00, '2026-10-28 18:45:00'),
  (22, 3, 'paid', 1298.00, '2026-11-02 11:10:00'),
  (23, 6, 'pending', 9.90, '2026-11-05 20:35:00'),
  (24, 4, 'cancelled', 358.00, '2026-11-08 10:25:00');

INSERT INTO order_items (id, order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 2, 59.00),
  (2, 1, 12, 1, 9.90),
  (3, 2, 6, 1, 6999.00),
  (4, 3, 3, 1, 499.00),
  (5, 3, 9, 1, 399.00),
  (6, 4, 4, 1, 329.00),
  (7, 5, 7, 1, 1999.00),
  (8, 5, 12, 1, 9.90),
  (9, 6, 2, 2, 199.00),
  (10, 7, 10, 1, 899.00),
  (11, 8, 8, 1, 9999.00),
  (12, 9, 12, 3, 9.90),
  (13, 9, 1, 1, 59.00),
  (14, 10, 11, 1, 159.00),
  (15, 10, 12, 1, 9.90),
  (16, 11, 2, 1, 199.00),
  (17, 12, 5, 1, 259.00),
  (18, 12, 12, 1, 9.90),
  (19, 13, 6, 1, 6999.00),
  (20, 13, 10, 1, 899.00),
  (21, 14, 4, 1, 329.00),
  (22, 14, 5, 1, 259.00),
  (23, 15, 9, 2, 399.00),
  (24, 16, 7, 1, 1999.00),
  (25, 16, 10, 1, 899.00),
  (26, 16, 12, 2, 9.90),
  (27, 17, 3, 1, 499.00),
  (28, 18, 1, 3, 59.00),
  (29, 18, 12, 1, 9.90),
  (30, 19, 11, 2, 159.00),
  (31, 19, 12, 2, 9.90),
  (32, 20, 2, 1, 199.00),
  (33, 20, 4, 1, 329.00),
  (34, 21, 5, 1, 259.00),
  (35, 22, 10, 1, 899.00),
  (36, 22, 9, 1, 399.00),
  (37, 23, 12, 1, 9.90),
  (38, 24, 2, 1, 199.00),
  (39, 24, 11, 1, 159.00);

INSERT INTO payments (id, order_id, method, amount, paid_at) VALUES
  (1, 1, 'alipay', 127.90, '2026-08-12 10:15:30'),
  (2, 2, 'wechat', 6999.00, '2026-08-15 14:20:45'),
  (3, 3, 'alipay', 898.00, '2026-08-20 09:06:00'),
  (4, 6, 'wechat', 398.00, '2026-08-28 16:11:20'),
  (5, 7, 'card', 899.00, '2026-09-02 10:02:10'),
  (6, 9, 'alipay', 88.70, '2026-09-08 20:16:00'),
  (7, 10, 'wechat', 168.90, '2026-09-12 09:46:30'),
  (8, 12, 'alipay', 268.90, '2026-09-18 11:56:05'),
  (9, 13, 'card', 7898.00, '2026-09-22 17:21:40'),
  (10, 15, 'wechat', 798.00, '2026-10-01 08:51:00'),
  (11, 16, 'alipay', 2917.80, '2026-10-05 19:31:15'),
  (12, 18, 'wechat', 186.90, '2026-10-12 10:41:00'),
  (13, 19, 'alipay', 337.80, '2026-10-18 16:01:30'),
  (14, 21, 'card', 259.00, '2026-10-28 18:46:00'),
  (15, 22, 'wechat', 1298.00, '2026-11-02 11:11:20');

INSERT INTO inventory (product_id, stock, updated_at) VALUES
  (1, 120, '2026-11-06 09:00:00'),
  (2, 60, '2026-11-06 09:00:00'),
  (3, 25, '2026-11-06 09:00:00'),
  (4, 40, '2026-11-06 09:00:00'),
  (5, 35, '2026-11-06 09:00:00'),
  (6, 15, '2026-11-06 09:00:00'),
  (7, 50, '2026-11-06 09:00:00'),
  (8, 8, '2026-11-06 09:00:00'),
  (9, 80, '2026-10-30 18:30:00'),
  (10, 45, '2026-10-30 18:30:00'),
  (11, 70, '2026-10-30 18:30:00'),
  (12, 200, '2026-10-30 18:30:00'),
  (13, 0, '2026-10-30 18:30:00'),
  (14, 30, '2026-10-30 18:30:00'),
  (15, 20, '2026-10-30 18:30:00');
