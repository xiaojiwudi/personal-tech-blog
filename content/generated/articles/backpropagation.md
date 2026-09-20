---
title: 反向传播（Backpropagation）
slug: backpropagation
summary: 用追责链条的直觉解释反向传播、链式法则、梯度下降及深层网络的梯度问题。
publishedAt: '2026-09-21'
lastUpdated: '2026-09-21'
primaryLayer: 60-learning
stackLayers:
- 60-learning
tags:
- deep-learning
- training
- backpropagation
- gradient-descent
- chain-rule
aliases: []
outboundSlugs:
- transformer
---
# 反向传播（Backpropagation）

## 一句话

**反向传播 = 用链式法则从输出端往回算每个权重的"责任"，然后沿梯度方向小步更新。** 这是所有神经网络训练的发动机。

## 直觉理解：追责链条

想象一个工厂流水线，最终产品出了质量问题。你不是把所有人一起罚，而是从最后一道工序往回追溯，算出每个人对最终错误"贡献了多少"，然后各自调整。

```
前向传播（干活）：  原料 → 工序A → 工序B → 工序C → 成品 → 质检（算误差）
反向传播（追责）：  误差 ← ∂L/∂C ← ∂L/∂B ← ∂L/∂A ← 每个权重的调整量
```

## 从单神经元说起

一个人工神经元做的事极其简单：

$$z = w_1 x_1 + w_2 x_2 + b \quad \text{（加权求和）}$$
$$a = \sigma(z) \quad \text{（激活函数压缩）}$$

## 交互演示：单神经元

拖动权重和偏置滑块，切换激活函数（ReLU / Sigmoid / Tanh），直观感受每个参数如何影响输出。

<iframe src="/interactives/5e6f3715824715dbc69af132c4f9088b8aeb9d2b4cb3035916b20238e4a56e65.html" width="100%" height="480" title="反向传播（Backpropagation） interactive" sandbox="allow-scripts" loading="lazy"></iframe>

把神经元堆起来分层排列，就得到了神经网络。输入层接收数据，隐藏层提取特征，输出层给答案。一开始所有权重都是随机的，需要通过**训练**来调整。

## 堆成网络

一层神经元只能做简单判断。把它们分层排列、全连接，就得到了神经网络。下面是一个 2-3-1 结构：2 个输入 → 3 个隐藏神经元 → 1 个输出。这个网络有 2×3 + 3×1 = 9 个权重 + 4 个偏置 = 13 个参数。深层网络可以有数十亿个这样的参数。

<img src="../assets/neural_network_structure.png" width="680" style="max-width:100%;border-radius:8px;">

## 交互演示：隐藏层直觉

拖动隐藏层参数，观察网络如何从简单线性边界学到复杂非线性决策边界。

<iframe src="/interactives/64c42061cc0ecce2a7a2c76163a99bcd20b111c70a0b0c1190f2d9e242c8440f.html" width="100%" height="550" title="反向传播（Backpropagation） interactive" sandbox="allow-scripts" loading="lazy"></iframe>

## 训练 = 两个阶段循环

### 第一阶段：前向传播（Forward Pass）

数据从左到右流过网络，算出预测值 $\hat{y}$：

```
x → 隐藏层 → 输出层 → ŷ
```

### 第二阶段：反向传播（Backward Pass）

算误差，从右往左追溯每个权重的责任：

**Step 1：算误差**

$$L = \frac{1}{n}\sum(\hat{y}_i - y_i)^2 \quad \text{（均方误差，衡量预测有多烂）}$$

**Step 2：算梯度**

对每个权重 $w$，求 $\frac{\partial L}{\partial w}$——"这个权重变一点，最终误差变多少"。

用链式法则逐层传递：

$$\frac{\partial L}{\partial w_1} = \frac{\partial L}{\partial a} \cdot \frac{\partial a}{\partial z} \cdot \frac{\partial z}{\partial w_1}$$

- $\frac{\partial L}{\partial a}$：误差对输出的敏感度
- $\frac{\partial a}{\partial z}$：激活函数的导数
- $\frac{\partial z}{\partial w_1}$：加权和对此权重的依赖

**Step 3：更新权重**

$$w \leftarrow w - \eta \cdot \frac{\partial L}{\partial w}$$

沿误差减小的方向迈一小步。$\eta$ 是学习率，决定步长。

## 为什么叫"反向"

因为梯度计算的方向和数据流动方向**相反**：

```
前向：x → W₁ → a₁ → W₂ → a₂ → L（算预测，存中间结果）
反向：L → ∂L/∂a₂ → ∂L/∂W₂ → ∂L/∂a₁ → ∂L/∂W₁（算梯度，逐步回传）
```

前向时每层的结果被暂存，反向时拿出来算梯度。所以反向传播对内存有额外需求——需要记住前向的中间激活值。

## 梯度下降

拿到了每个权重的梯度 $\frac{\partial L}{\partial w}$ 之后，沿梯度的反方向小步移动：

$$w_{new} = w_{old} - \eta \cdot \nabla_w L$$

- $\eta$ 太小 → 收敛慢，可能卡在局部最小值
- $\eta$ 太大 → 在最低点两侧反复横跳，无法收敛

> 交互演示：拖动滑块调整学习率，观察小球如何沿损失曲面滚向最低点。

<iframe src="/interactives/0b89d14d3ddc7a4e7fc005f32262f564c38b8a4505cd654aefd4211d93c6012b.html" width="100%" height="500" title="反向传播（Backpropagation） interactive" sandbox="allow-scripts" loading="lazy"></iframe>

## 核心概念速查

| 概念 | 一句话 |
|:---|:---|
| 权重 $w$ | 控制连接的"重要程度"，是网络真正学到的东西 |
| 偏置 $b$ | 让神经元有独立于输入的初始倾向 |
| 激活函数 $\sigma$ | 引入非线性——没有它，一万层也只等价于一层线性变换 |
| 损失函数 $L$ | 量化预测有多差，是整个训练的优化目标 |
| 梯度 $\nabla L$ | 损失函数在每个参数上的"坡度"，指向上升最快的方向 |
| 学习率 $\eta$ | 每次沿梯度方向移动的步长 |
| 链式法则 | 把复杂函数的导数拆成简单导数的连乘 |

## 为什么这很重要

- rnn 的梯度消失来自链式法则连乘中的 $\tanh' \leq 1$，乘多了指数衰减
- lstm 的解决方案是让梯度路径上只剩一个 $f_t$ 系数，避免矩阵连乘
- [transformer](/articles/transformer/) 的残差连接也是同一个思路：给梯度留一条无障碍的旁路

**所有关于"为什么这个架构好"的讨论，最终都要回到反向传播的梯度流上。**

## 来源

- Claude 对话分享：神经网络从零开始（2026-05-02）
- 总结加工后入库

## 相关笔记

- mlp：最基础的神经网络结构，反向传播的演示模型
- rnn：反向传播沿时间展开（BPTT），梯度消失的受害者
- lstm：用细胞状态解决梯度消失
- deep-learning-building-blocks：五大构件框架
