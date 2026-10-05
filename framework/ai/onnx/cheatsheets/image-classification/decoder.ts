/**
 * 解码模块：模型输出 → Top-K 类别（纯函数，不碰 DOM、不碰会话）。
 * 演示内容：softmax 概率化、与标签表按索引对齐、取前 K；这是本课新增的
 * 「输出解读」环节，写成纯函数后切换 K 不必重跑推理。
 * 输入：输出张量的数值（squeezenet1.1-7 实测为原始 logits，见 classifier.ts 的注释）
 * 与 parseSynset 解析出的标签表。
 * 预期结果：Top-1 与照片主体一致；若置信度接近 1 且 logits 范围达数百，
 * 优先怀疑预处理错域而不是模型厉害。
 * 阅读主线：softmax → topK → parseSynset。
 */

/** Top-K 的一个条目：类别索引、标签与 softmax 后的概率。 */
export interface ClassScore {
  index: number;
  label: string;
  prob: number;
}

/**
 * softmax（数值稳定版：先减最大值再取 exp，防止大 logit 溢出）。
 * 输出已是概率的模型不需要这一步——判别方法见课程正文「选模型与类别标签表」。
 */
export function softmax(values: ArrayLike<number>): number[] {
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] > max) {
      max = values[i];
    }
  }
  const exps = new Array<number>(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    exps[i] = Math.exp(values[i] - max);
    sum += exps[i];
  }
  return exps.map((value) => value / sum);
}

/** Top-K：与标签表按索引对齐后取概率最大的 K 个。长度不一致立即报错而不是静默错位。 */
export function topK(probs: readonly number[], labels: readonly string[], k: number): ClassScore[] {
  if (probs.length !== labels.length) {
    throw new Error(`标签表行数（${labels.length}）与输出类别数（${probs.length}）不一致，先核对对齐再解码。`);
  }
  return probs
    .map((prob, index) => ({ index, prob, label: labels[index] }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, k);
}

/**
 * 解析 ONNX Model Zoo 的 synset.txt：每行「wnid 类别名」，行号即类别索引，
 * 返回纯类别名数组。换成 HuggingFace 等其他来源时，先确认它的索引约定一致。
 */
export function parseSynset(text: string): string[] {
  return text
    .trim()
    .split('\n')
    .map((line) => line.replace(/^\S+\s+/, ''));
}
