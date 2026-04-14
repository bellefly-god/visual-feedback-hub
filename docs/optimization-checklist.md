# Visual Feedback Hub 优化清单

## 📅 Phase 1: 紧急修复

### 1.1 Error Boundary
```bash
# 创建 Error Boundary 组件
touch src/components/ErrorBoundary.tsx
```
- [ ] 创建 `ErrorBoundary` 组件
- [ ] 包装 EditorController
- [ ] 添加降级 UI 设计

### 1.2 RLS 策略修复
```sql
-- 更新数据库策略
-- 参考 docs/security/rls-policies.sql
```
- [ ] 备份当前策略
- [ ] 实现基于 owner_id 的访问控制
- [ ] 测试跨用户数据隔离

### 1.3 UX 改进
- [ ] 添加删除确认对话框
- [ ] 集成 Sonner Toast 通知
- [ ] 添加未保存更改提示

---

## 📅 Phase 2: 性能优化

### 2.1 代码分割
- [ ] 更新 `vite.config.ts` 配置 manualChunks
- [ ] 添加 React.lazy + Suspense
- [ ] 验证 bundle 大小减少

### 2.2 PDF.js 优化
- [ ] 创建独立的 PDF 编辑器 chunk
- [ ] 实现条件加载
- [ ] 添加加载进度指示器

### 2.3 图片优化
- [ ] 添加 `loading="lazy"`
- [ ] 实现缩略图生成
- [ ] 添加 srcSet 支持

---

## 📅 Phase 3: 安全加固

### 3.1 Supabase Auth 迁移
- [ ] 配置 Supabase Auth
- [ ] 更新 authService.ts
- [ ] 添加邮箱验证
- [ ] 测试登录/注册流程

### 3.2 速率限制
- [ ] 创建 Supabase Edge Function
- [ ] 添加项目创建频率限制
- [ ] 添加评论频率限制

### 3.3 审计日志
- [ ] 创建 audit_logs 表
- [ ] 记录关键操作
- [ ] 添加日志查看功能

---

## 📅 Phase 4: 功能增强

### 4.1 键盘快捷键
- [ ] 创建 ShortcutsHelpModal
- [ ] 文档化所有快捷键
- [ ] 添加 Cmd+/ 触发

### 4.2 移动端适配
- [ ] 添加响应式断点
- [ ] 实现触控手势
- [ ] 优化 Pinch-to-zoom

### 4.3 实时协作
- [ ] 配置 Supabase Realtime
- [ ] 订阅评论变化
- [ ] 添加在线状态

### 4.4 PWA
- [ ] 添加 manifest.json
- [ ] 创建 Service Worker
- [ ] 实现离线支持

---

## ✅ 验证检查清单

### 构建验证
```bash
npm run build           # 无错误
npx tsc --noEmit       # 无类型错误
npm run lint           # 无 lint 错误
```

### 功能验证
- [ ] 首页加载 < 3s
- [ ] Dashboard 加载 < 2s
- [ ] 评论创建 < 1s
- [ ] 无控制台错误

### 安全验证
- [ ] RLS 策略正确
- [ ] XSS 测试通过
- [ ] CSRF 测试通过
- [ ] SQL 注入测试通过

### 性能验证
```bash
# Lighthouse 检查
- Performance > 80
- Accessibility > 90
- Best Practices > 90
- SEO > 90
```
