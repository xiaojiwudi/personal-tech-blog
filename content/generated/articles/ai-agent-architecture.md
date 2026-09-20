---
title: AI 编程 Agent 架构深度解析
slug: ai-agent-architecture
summary: 从交互循环、上下文、权限、工具、记忆与成本出发，拆解 AI 编程 Agent 的系统架构。
publishedAt: '2026-09-21'
lastUpdated: '2026-09-21'
primaryLayer: 80-agent
stackLayers:
- 80-agent
tags:
- ai-agent
- claude-code
- tool-use
- architecture
- context-management
- token-optimization
aliases: []
outboundSlugs: []
---
# AI 编程 Agent 架构深度解析

> AI 编程 Agent 不是「更聪明的代码补全」，而是一个在终端里拥有文件读写、命令执行、外部 API 调用能力的自主代理。理解它的架构才能把它用到极致。

---

## 核心认知：Agent 的交互循环

```
用户输入 → Agent 推理 → 工具调用（读文件/跑命令/改代码） → 结果返回 → Agent 再推理 → ... → 交付
```

区别于普通 Chatbot 的关键：**Agent 有执行能力，不只是给建议**。它能读你的整个代码库、执行 shell 命令、修改文件、操作 Git。这既是最大优势，也是最大风险。

---

## 上下文管理：Token 消耗的真相

### Token 都烧在哪

| 消耗源 | 占比（粗略） | 可控性 |
|--------|-------------|--------|
| 系统提示词（system prompt） | 固定开销，约 2k-5k | 低 |
| 项目记忆文件（CLAUDE.md / rules） | 每次对话自动加载 | 中 |
| 工具定义（MCP / built-in tools） | 每个 MCP 服务器 3k-10k | 高 |
| 对话历史 | 随轮次线性增长 | 高 |
| 文件内容（读到上下文里） | 按需消耗 | 中 |

### Context Rot（上下文腐烂）

当上下文窗口被填满或接近填满时，模型的推理质量会**显著下降**。表现为：
- 忘记之前讨论过的约束
- 生成与前面矛盾的代码
- 忽略已建立的架构决策
- 开始「偷懒」砍步骤

**关键阈值经验**：对话超过 20-25 轮后应 `/compact` 压缩，切换完全不同任务时 `/clear` 重置。

### 上下文管理三板斧

| 操作 | 场景 | 效果 |
|------|------|------|
| `/compact [保留内容]` | 对话超过 20 轮 | 高密度压缩历史，保留关键决策 |
| `/clear` | 切换全新任务 | 清空上下文，从头开始 |
| Plan Mode 先规划 | 任何复杂任务 | 避免写错重来，省 5-10 倍 Token |

---

## 权限模式：安全与效率的平衡

AI Agent 真正能改你的文件，所以权限系统是核心防线。

### 四种模式

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **Plan Mode** | 只读不写，仅输出架构蓝图 | 开始复杂功能前的第一步 |
| **Ask before edits** | 修改前逐一确认 | 新手、高风险项目 |
| **Edit automatically** | 自动修改文件 | 日常开发（黄金平衡点） |
| **Bypass permissions** | 无任何限制 | CI/CD 受信环境 |

### Plan Mode 为什么是王牌

> 一分钟的计划省下十分钟的重构。

Plan Mode 下 Agent **只读不写**，主动研究所有相关代码，输出包含文件结构、依赖关系、实现步骤的详细蓝图。确认后再切换到 Edit Mode 实现。

**工作流**：
```
需求 → Plan Mode 生成蓝图 → 人工审查架构 → 确认 → Edit Mode 实现
```

这个流程在复杂跨文件修改时，平均节省 **5-10 倍**的 Token 重构成本。

---

## Sub-agents：并行架构

### 为什么需要 Sub-agents

单个 Agent 的上下文窗口有限。当一个任务涉及多个独立子任务（跑测试、审代码、写文档），全部塞进一个上下文会导致 Context Rot。

Sub-agents 的解法：**主 Agent 派发任务给多个独立子 Agent，各自在自己的上下文窗口里干活，最后汇总**。

```
主 Agent（Orchestrator）
  ├── Sub-agent 1：跑测试套件
  ├── Sub-agent 2：代码审查
  ├── Sub-agent 3：更新文档
  └── 汇总：合成统一报告
```

### 关键原则

- 每个 Sub-agent 的任务必须是**独立的**，不需要共享中间状态
- 用 Git Worktrees 隔离每个 Agent 的工作目录，防止文件冲突
- Sub-agent 适合「明确分工」的任务；探索性任务用 Agent Teams（实验性功能）

---

## 工具使用：命令 > HTTP

Agent 连接外部服务时，**CLI 命令比 HTTP API 省 Token**。

| 方式 | Token 消耗 | 原因 |
|------|-----------|------|
| CLI（`gh`, `aws`, `gcloud`） | 低 | 输出紧凑，Agent 只解析最终结果 |
| HTTP API + response parsing | 高 | 完整 JSON 响应全部塞进上下文 |

**实践**：告诉 Agent 优先用 CLI 工具（`gh` 而不是 GitHub REST API，`sentry-cli` 而不是 Sentry HTTP API）。

---

## 记忆系统：跨对话的知识保留

### CLAUDE.md / Project Rules

项目根目录的配置文件，每次对话自动加载。放什么：
- 技术栈、启动命令、测试命令
- 编码规范和禁止事项
- 目录结构速览

**核心原则**：
- **首因效应**：最关键的硬约束放文件最前面
- 总长度控制在 200-500 行
- 不要塞完整 API 文档，放链接即可

### Automemory

结构化记忆写入：格式为「规则 + 动机 + 应用场景」。让 Agent 在有动机背景的情况下执行规则，而不是死记硬背。

---

## 案例：ECC 的 Agent 架构实践

ECC 在上下文管理、并行编排和权限控制三个方面给出了比 Claud Code 原生更激进的方案：

### 上下文管理：信号分流

ECC 把 Agent 的上下文分成三条独立信道：

| 信道 | 载体 | 加载时机 | Token 成本 |
|------|------|---------|-----------|
| **全局硬约束** | `CLAUDE.md`（根 + 子目录覆盖） | 每次对话自动加载 | 每次都花，必须极简（≤500 行） |
| **场景流程** | Skill（按用户意图触发） | description 匹配时加载 | 按需，平时只占 ~100 token |
| **领域规则** | `rules/`（按语言自动注入） | Agent 进入对应语言文件时注入 | 按文件，平时不占 |

这和 Claude Code 原生把所有东西塞进一个上下文的做法有本质区别：**上下文不是堆栈，是优先级队列**。硬约束永远在最前面，场景流程按需加载，领域规则在进入对应文件时自动注入。

### 并行编排：git worktree 隔离

ECC 的多 agent 并行不是简单的「同时调多个 subagent」：

```
主 Agent
  │
  ├── Worktree 1：agent A 在独立分支 feature/auth 上工作
  ├── Worktree 2：agent B 在独立分支 feature/api 上工作
  └── Worktree 3：agent C 在独立分支 fix/bug-42 上工作
  │
  │  每个 worktree 有独立的文件系统、git 状态、tmux 面板
  │  互不干扰，可以并行 merge
  ▼
汇总：所有 worktree 合并回主分支
```

对比普通 subagent：普通 subagent 共享同一个工作目录，文件冲突靠运气；worktree 隔离保证了每个 agent 的工作空间是干净的。

### 权限控制：agent 级工具白名单

ECC 最激进的设计：**每个 agent 声明自己能用的工具**。

```yaml
# planner agent: 只能读
tools: ["Read", "Grep", "Glob"]

# code-reviewer agent: 只能读 + 搜索
tools: ["Read", "Grep", "Glob", "WebSearch"]

# build-error-resolver agent: 能读能写能跑命令
tools: ["Read", "Grep", "Glob", "Write", "Edit", "Bash"]
```

这和 Claude Code 原生「要么全给要么全不给」的权限模式完全不同。ECC 的最小权限原则是**按角色授信**，不是按任务授信。

---

## 相关笔记

- ecc-architecture — ECC 完整架构分析：上下文管理、并行编排、权限控制
- skills-framework-design — Skills 框架设计方法论
- harness-engineering — Harness 工程总览（Skills 是 Guides 层的子集）
- agent-decision-paradigms — Agent 决策范式：ReAct / Plan-and-Execute / Reflexion
- agent-from-scratch — Agent 本质 + 从零搭建路线图（控制论视角）
- `claude-code-vs-hanaagent` — Claude Code 与 HanaAgent 对比（待实际调研后建页）
- rosbridge-debug-platform — ROS2 开发工作流中的工具链实践

## 来源

- Claude Code 2026 完整使用指南 (fluxio.dev)
- Anthropic 官方文档 (code.claude.com/docs)
- 与 Hanako 讨论中产生 (2026-06-04)
