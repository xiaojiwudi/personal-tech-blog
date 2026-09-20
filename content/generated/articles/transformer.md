---
title: Transformer
slug: transformer
summary: 用特征提取与几何视角解释 Transformer、Self-Attention、Multi-Head Attention 及训练流程。
publishedAt: '2026-09-21'
lastUpdated: '2026-09-21'
primaryLayer: 60-learning
stackLayers:
- 60-learning
tags:
- deep-learning
- attention
- transformer
- feature-extraction
- sequence-modeling
aliases: []
outboundSlugs: []
---
# Transformer

## 一句话

**Transformer = 让数据自己决定该看哪里，一步到位看全局。** 跟 cnn 平级，都是特征提取器，但 CNN 看局部、Transformer 看全局。

## 在四大构件框架中的位置

Transformer 不是替换某一个构件，它是**把 cnn 的位置顶掉了**。而且它内部自带 concat + mlp，等于一个微型流水线：

```
原来的管线：
  图像 → CNN → 特征 → Concat → MLP → 输出

Transformer 版：
  图像 → Transformer → 特征 → MLP → 输出
         ↑
         它同时干了 CNN + Concat 的活
```

## 内部结构与构件的对应

一个 Transformer Block 内部刚好踩中了三个构件：

```
Input
  ↓
Multi-Head Self-Attention         ← 替代 CNN，动态提取特征
  ├─ Head 1 ─┐
  ├─ Head 2 ─┼─ Concat → 线性投影 ← 就是 concat
  ├─ ...     ─┘
  ↓  ┌── 残差 + LayerNorm
FFN (两层全连接 + 激活)            ← 就是 mlp
  ↓  ┌── 残差 + LayerNorm
Output
```

| Transformer 组件 | 对应构件 | 说明 |
|---|---|---|
| Self-Attention | cnn 的替代品 | 都负责提取特征，但机制不同 |
| Multi-Head 拼接 | concat | 多个头各自看完后拼在一起投影 |
| FFN | mlp | 标准的两层全连接 + 非线性 |

**Transformer = Self-Attention + Concat + MLP 的递归嵌套。** 四大构件在微观上又出现了一次。

## 交互教程：从零开始的 Self-Attention

> 🌸 点击下方链接，在浏览器或 Obsidian 中打开完整交互教程。每一步都是可播放的动画，用键盘 ← → 翻页。

📺 **[从零开始的 Self-Attention · 交互教程](/interactives/73f339df0626fb6edcbf80fcb6c919377e693ede5ff560d098e5d9ab75934c9a.html)**（7 步完整推导）

<iframe src="/interactives/73f339df0626fb6edcbf80fcb6c919377e693ede5ff560d098e5d9ab75934c9a.html" width="100%" height="620" title="Transformer interactive" sandbox="allow-scripts" loading="lazy"></iframe>

> 如果 iframe 看不到完整内容，直接在浏览器打开 `wiki/stack/60-learning/assets/self_attention_from_zero.html`。

## Self-Attention：每个数学操作背后的几何故事

Self-Attention 的核心公式只有一行：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

但这行公式里藏着四个几何操作，每一个都是一次空间变换。拆开看。

### 第一步：QKV 是哪来的——线性投影 = 换一个角度看数据

输入是一串 token 向量 $X = [x_1, x_2, ..., x_n]$，每个 $x_i \in \mathbb{R}^{d_{model}}$。

$$Q = XW_Q, \quad K = XW_K, \quad V = XW_V$$

$W_Q, W_K, W_V$ 是可学习的投影矩阵。同一个 token 被投影到三个不同的子空间：

- **Query**："我要找什么"——每个 token 在这个空间里表达自己的**需求**
- **Key**："我是什么"——每个 token 在这个空间里表达自己的**身份标签**
- **Value**："我身上有什么信息"——每个 token 在这个空间里表达自己**携带的内容**

**几何直觉**：这是你在高维空间里换三个不同的坐标系看同一组点。同一个向量 $x_i$，在 $W_Q$ 坐标系里它的坐标是 $q_i$，在 $W_K$ 坐标系里是 $k_i$。三个投影矩阵是**训练中学出来的**——网络自己学会了"哪些方向适合做查询，哪些方向适合做索引"。

### 第二步：$QK^T$——点积测量"我有多想关注你"

$$S = QK^T$$

$S_{ij} = q_i \cdot k_j$ 是第 $i$ 个 token 的 Query 和第 $j$ 个 token 的 Key 做点积。

**几何直觉**：两个向量的点积 = $\|q_i\| \cdot \|k_j\| \cdot \cos\theta$。它是三个因素的乘积：Query 的长度、Key 的长度、它们之间夹角的余弦。

- 方向一致（$\cos\theta \approx 1$）→ 点积大 → 高相关性 → 这个 token "应该被看到"
- 方向正交（$\cos\theta \approx 0$）→ 点积 ~ 0 → 无关
- 方向相反（$\cos\theta \approx -1$）→ 点积负 → "反相关"，softmax 后会趋近于 0

所以 $QK^T$ 的本质：**在一个可学习的高维空间里，用"方向一致性"来定义"相关性"。** 网络通过调整 $W_Q$ 和 $W_K$，决定哪些 token 的 Query 方向应该和哪些 token 的 Key 方向对齐。

### 第三步：除以 $\sqrt{d_k}$——对抗高维点积的方差爆炸

$$\frac{QK^T}{\sqrt{d_k}}$$

这是全公式中最不起眼但最精妙的一步。

**问题**：假设 $q$ 和 $k$ 的每个分量是独立同分布、均值为 0 方差为 1 的随机变量。$d_k$ 维点积 $q \cdot k = \sum_{i=1}^{d_k} q_i k_i$，每一项 $q_i k_i$ 的方差是 1（两个独立单位方差变量乘积的方差 = 1），所以整个点积的方差 = $d_k$。

$d_k = 64$ 时，点积的典型值在 $\pm 8$ 量级。$d_k = 512$ 时，典型值在 $\pm 22$ 量级。

**后果**：点积绝对值很大 → softmax 的输入很大 → softmax 输出趋近于 **one-hot 向量**（一个元素接近 1，其余接近 0）→ 梯度接近 0 → **网络学不动了**。

除以 $\sqrt{d_k}$ 把点积的方差从 $d_k$ 拉回到 1，让 softmax 保持在一个"温和"的区域——既不是均匀分布（太软，没有选择性），也不是 one-hot（太硬，梯度消失），而是**有区分度但可训练**的中间态。

**几何直觉**：高维空间里，随机向量之间的点积天然就很大（因为维度多了，每一项都在贡献）。除以 $\sqrt{d_k}$ 是在高维空间的"膨胀"上踩刹车，强制点积保持在和低维空间一样的量级。

### 第四步：softmax——把相关性变成概率分布

$$A = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)$$

softmax 对每一行做：$A_{ij} = \frac{e^{s_{ij}}}{\sum_k e^{s_{ik}}}$。

两个效果同时发生：
1. **非负化**：$e^x > 0$ 对所有 $x$，所以注意力权重永远是正的
2. **归一化**：每一行的和 = 1，所以是一份"注意力预算"——第 $i$ 个 token 把 100% 的注意力分配给所有 token，$A_{ij}$ 是给第 $j$ 个 token 的份额

**几何直觉**：softmax 把点积分数变成了一张**概率单纯形上的点**。$n$ 个 token 的注意力分布是 $n-1$ 维单纯形上的一个点。温度 $\sqrt{d_k}$ 控制分布的"锐度"——温度越低分布越尖（极端集中），温度越高分布越平（均匀分配）。

### 第五步：左乘 $V$——按注意力权重加权聚合

$$\text{Output} = AV$$

展开来看：$\text{output}_i = \sum_{j=1}^{n} A_{ij} v_j$。

第 $i$ 个 token 的输出 = 所有 token 的 Value 的加权平均，权重是注意力矩阵的第 $i$ 行。

**这才是"让数据自己决定该看哪里"的数学实现**：

- 如果 $A_{i3} \approx 0.9$，第 $i$ 个 token 的输出几乎全是第 3 个 token 的 Value——它决定"看"第 3 个 token
- 如果所有 $A_{ij}$ 差不多，输出是所有 Value 的简单平均——它没有特别关注任何 token

**几何直觉**：输出向量是 Value 向量在注意力权重下的**凸组合**（convex combination）。它必定落在所有 Value 向量的凸包（convex hull）内。这意味着 Self-Attention 的输出不可能"跑出"输入 Value 所张成的区域——它是 Value 之间的插值，而不是外推。这是为什么 Transformer 需要 FFN（MLP）来做非线性变换：Self-Attention 只做**重组**，FFN 做**变换**。

### 全过程走一遍（用两个 token 举例）

假设输入是两个 token：$x_1$（"猫"），$x_2$（"坐"）。

```
1. 投影
   q₁ = W_Q·x₁  ("猫" 想问：我跟谁有关系？)
   k₁ = W_K·x₁  ("猫" 回答：我是'猫')
   v₁ = W_V·x₁  ("猫" 的语义内容)

   q₂ = W_Q·x₂  ("坐" 想问：我跟谁有关系？)
   k₂ = W_K·x₂  ("坐" 回答：我是'坐')
   v₂ = W_V·x₂  ("坐" 的语义内容)

2. 算相关性
   S = [q₁·k₁  q₁·k₂]   = [0.8, 0.6]    ← "猫" 跟自己和"坐"都相关
       [q₂·k₁  q₂·k₂]     [0.3, 0.9]    ← "坐" 更关注自己

3. 除以 √d_k 再 softmax
   A = [0.55, 0.45]    ← "猫" 55% 注意力给自己，45% 给"坐"
       [0.35, 0.65]    ← "坐" 65% 给自己，35% 给"猫"

4. 加权聚合
   output₁ = 0.55·v₁ + 0.45·v₂   ← "猫" 融入了"坐"的信息
   output₂ = 0.35·v₁ + 0.65·v₂   ← "坐" 融入了"猫"的信息
```

两个 token 的输出都包含了对方的信息，但保留了自己的主导权。**上下文通过可微分的加权平均注入到每个 token 的表示里。**

## 交互演示：自注意力权重

拖动 Query、Key、Value 滑条，观察注意力权重如何动态分配。直观感受"数据自己决定该看哪里"。

<iframe src="/interactives/551e0742e11619176052b23927ed63bcba0215f69342f2ba99957f6d4486dfe2.html" width="100%" height="650" title="Transformer interactive" sandbox="allow-scripts" loading="lazy"></iframe>

> 在 Obsidian Live Preview 模式下打开即可交互。备选方案：浏览器直接打开 `wiki/stack/60-learning/assets/self_attention.html`。

## CNN vs Transformer：核心区别

| | cnn | Transformer |
|---|---|---|
| **感受野** | 局部（3×3 卷积核） | 全局（每个 token 看所有 token） |
| **权重** | 固定（同一个核滑过全图） | 动态（由数据内容决定注意力分布） |
| **归纳偏置** | 局部性、平移等变性 | 无位置先验（需要位置编码补救） |
| **参数效率** | 高（权重共享） | 低（注意力矩阵 O(n²)） |
| **适合数据** | 有明确空间局部结构（图像） | 无局部结构或需要长程依赖（文本、序列） |

## 直觉类比（配上数学映射）

CNN 像是信息在人群里**口口相传**：每个人只跟身边的人说话，要传遍全场需要一层层传过去。
→ 数学上：感受野逐层扩大，长程依赖所需的层数 = 距离 / 感受野半径

Transformer 像是所有人站在一个**大喇叭**前面，每个人都能直接听到所有人说什么。
→ 数学上：$O(n^2)$ 的注意力矩阵让任意两个 token 的距离固定为 1 层

```
CNN 看猫：
  边缘 → 纹理 → 眼睛 → 猫脸 → 整只猫
  （层层传递，信息路径长度 = 层数，每层参数量固定）

Transformer 看猫：
  每个像素直接看所有像素 → 一步知道整只猫在哪
  （信息路径长度 = 1，但注意力矩阵是 n×n，显存 O(n²)）
```

**两个类比背后的数学本质**：CNN 的信息传播速度是每层一个感受野半径，Transformer 是每层全局。这是归纳偏置（inductive bias）和计算复杂度之间的权衡——CNN 赌的是"有意义的信息在局部"，Transformer 不赌，全看。

## 什么时候用 CNN，什么时候用 Transformer

- **图像任务**：CNN 仍然是最稳的选择（效率高、局部归纳偏置天然匹配图像结构）。ViT 等 Transformer 变体在数据量足够大时能超过 CNN。SegFormer 用分层 Transformer + 轻量 MLP 解码器做语义分割，3.7M 参数达到 SOTA，是 Transformer 替代 CNN 做 dense prediction 的典型。
- **文本 / 序列 / 多模态融合**：Transformer 是默认选择，因为序列没有局部空间结构，CNN 的一维卷积窗口太小。
- **机器人感知**：CNN 处理相机图像，Transformer 处理时序状态序列或多传感器 token 化后做 cross-attention 融合。两者常常共用。

## 在机器人管线中的典型用法

```
相机 → CNN → 视觉特征 ──↘
                        Concat → MLP → 控制
激光 → PCA → 压缩特征 ──↗

# 或者用 Transformer 替代 CNN：
相机 → ViT → 视觉 token ──↘
                            Cross-Attention → MLP → 控制
状态序列 → Transformer ────↗
```

## 关键应用：ACT

act（Action Chunking with Transformers）是 Transformer 在机器人模仿学习中的标志性应用。它用 Transformer Encoder 编码多视角图像和关节状态，用 Transformer Decoder 自回归生成动作序列。核心创新「一次预测 90 步动作」让低成本双臂硬件（$20k ALOHA）也能完成穿线、装电池等精细操作。详见 act。

## 记忆口诀

原四字诀：PCA **压缩**，CNN **提取**，Concat **拼接**，MLP **融合**

加入 Transformer：PCA **压缩**，CNN **提取**（局部），**Transformer 提取**（全局），Concat **拼接**，MLP **融合**

参见 deep-learning-building-blocks。

## 交互演示：BERT 微调

BERT 在预训练后如何在下游任务上微调，完整流程可视化。

<iframe src="/interactives/1f733c6174369461323d4a68b6490252c6b20d16b2a7059c56c75b416ad18bb5.html" width="100%" height="600" title="Transformer interactive" sandbox="allow-scripts" loading="lazy"></iframe>

> 在 Obsidian Live Preview 模式下打开即可交互。备选方案：浏览器直接打开 `wiki/stack/60-learning/assets/bert_finetune.html`。

## 相关笔记

- deepseek-v4-pro-architecture — DeepSeek V4 Pro 的 MoE + CSA/HCA 混合注意力是 Transformer 架构的最新演进
- vision-llm-timeline：CV 与 NLP 两条发展时间线的全景导读
