# demoboard

局域网临时白板演示系统。主机启动一个 Node 服务后，主机浏览器和平板浏览器访问同一个 `/room/demo` 页面即可实时同步绘制内容。

## 功能

- React + Vite 前端
- tldraw 白板
- tldraw sync + WebSocket 实时同步
- 固定房间 `/room/demo`
- 无账号、无数据库，白板状态保存在服务进程内存中
- 支持局域网访问，默认监听 `0.0.0.0:3000`
- `/` 自动进入 `/room/demo`
- 页面顶部显示当前访问地址并可复制

## 使用

安装依赖：

```bash
npm install
```

启动局域网服务：

```bash
npm run start:lan
```

服务默认监听：

```text
0.0.0.0:3000
```

主机浏览器访问：

```text
http://localhost:3000/room/demo
```

同一 WiFi / 局域网内的平板访问：

```text
http://主机IP:3000/room/demo
```

例如：

```text
http://192.168.1.36:3000/room/demo
```

## 构建与生产启动

```bash
npm run build
npm start
```

## 配置

可通过环境变量调整监听地址：

```bash
HOST=0.0.0.0 PORT=3000 npm run start:lan
```

## 说明

白板状态只保存在内存中。进程重启或最后一个客户端离开房间后，当前房间内容会被释放，符合临时演示场景。
