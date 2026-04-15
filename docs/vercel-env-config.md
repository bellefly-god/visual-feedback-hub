# Vercel 环境变量配置指南

## 必需的环境变量

在 Vercel 项目设置中，进入 **Settings → Environment Variables**，添加以下变量：

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `VITE_USE_SUPABASE_AUTH` | 启用真实认证 | `true` |

## 关于 `VITE_USE_SUPABASE_AUTH`

### 这个变量应该设置在哪里？

**是的，需要在 Vercel 环境变量中设置。**

```bash
VITE_USE_SUPABASE_AUTH=true
```

### 作用说明

| 值 | 行为 |
|----|------|
| `false` 或未设置 | 使用 localStorage 模拟认证（开发/测试模式） |
| `true` | 使用 Supabase Auth 真实认证 |

### 认证模式区别

#### `VITE_USE_SUPABASE_AUTH=false`（默认）

- 认证数据存储在浏览器 localStorage
- 每个设备/浏览器有独立的用户会话
- 适合本地开发和快速测试

#### `VITE_USE_SUPABASE_AUTH=true`

- 认证由 Supabase Auth 处理
- 用户数据持久化到云端
- 支持邮箱验证、密码重置
- 支持跨设备登录
- **推荐用于生产环境**

### 设置步骤

1. 登录 Vercel Dashboard
2. 选择你的项目
3. 进入 **Settings → Environment Variables**
4. 添加变量：
   ```
   Name: VITE_USE_SUPABASE_AUTH
   Value: true
   Environment: Production, Preview, Development (全选)
   ```
5. 点击 **Save**
6. **重新部署项目**（环境变量更改后需要重新部署才能生效）

### 验证配置

部署后，可以通过以下方式验证：

1. 访问应用登录页
2. 如果 `VITE_USE_SUPABASE_AUTH=true`：
   - 登录请求会发送到 Supabase Auth API
   - 可以在 Supabase Dashboard > Authentication > Users 看到用户
3. 如果 `VITE_USE_SUPABASE_AUTH=false`：
   - 登录数据存储在 localStorage
   - 刷新页面后可能丢失（取决于浏览器设置）

## 注意事项

⚠️ **重要**：环境变量更改后，必须重新部署项目才能生效。

⚠️ **安全**：`VITE_SUPABASE_ANON_KEY` 是公开密钥，可以安全地暴露在前端代码中。但请确保：
- 不要泄露 `service_role` 密钥
- 正确配置 Supabase RLS（Row Level Security）策略
