# 爆文猎人 — LLM 成本控制与安全管理

| 字段 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-06-04 |
| 关联文档 | 认证与多用户架构设计.md、调度策略与任务编排.md |

---

## 一、LLM 成本分析

### 1.1 单次调用成本估算

| 操作 | 模型 | 输入Token | 输出Token | 单次成本(USD) | 说明 |
|------|------|-----------|-----------|---------------|------|
| 爆款分析 | GPT-4o-mini | ~2000 | ~800 | ~$0.003 | 长文输入+结构化输出 |
| 标题公式识别 | GPT-4o-mini | ~500 | ~300 | ~$0.001 | 短输入+标签输出 |
| 情绪标注 | GPT-4o-mini | ~500 | ~200 | ~$0.001 | 短输入+标签输出 |
| 单平台改写 | GPT-4o-mini | ~2500 | ~1500 | ~$0.006 | 原文+规则+改写结果 |
| 改写自检 | GPT-4o-mini | ~2000 | ~200 | ~$0.002 | 改写结果+相似度判断 |

### 1.2 用户完整操作成本

| 操作链路 | LLM调用次数 | 预估成本(USD) |
|----------|-------------|---------------|
| 采集→分析1篇 | 1次 | ~$0.003 |
| 采集→分析→改写1篇(7平台) | 8次(1分析+7改写) | ~$0.045 |
| 上传10篇→全部分析 | 10次 | ~$0.03 |
| 上传10篇→全部分析→3篇改写7平台 | 31次 | ~$0.165 |
| **每日50活跃用户，平均每人1条完整链路** | ~400次/天 | **~$2.25/天 ≈ $67/月** |

### 1.3 成本控制目标

| 指标 | MVP目标 | 说明 |
|------|---------|------|
| 月均LLM成本 | < $100 | MVP阶段可承受 |
| 单用户日均成本 | < $0.10 | 基于配额控制 |
| 峰值并发 | < 20 QPS | 避免触发API限流 |

---

## 二、成本控制策略

### 2.1 用户配额（已在认证文档定义）

| 维度 | 免费额度 | 说明 |
|------|----------|------|
| 每日分析 | 50次 | 足够日常使用 |
| 每日改写 | 20次 | 20篇×7平台=140次LLM调用 |
| 每日上传 | 50个文件 | 配合分析配额 |
| 单次改写平台数 | 最多7个 | 前端可勾选 |

### 2.2 系统级并发控制

```python
import asyncio

class LLMConcurrencyLimiter:
    """LLM并发控制器"""
    
    def __init__(self, max_concurrent: int = 10, max_per_minute: int = 60):
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._request_times: list[float] = []
        self._max_per_minute = max_per_minute
    
    async def acquire(self):
        """获取调用许可，超限则等待"""
        # 速率限制：每分钟不超过N次
        now = asyncio.get_event_loop().time()
        self._request_times = [t for t in self._request_times if now - t < 60]
        if len(self._request_times) >= self._max_per_minute:
            wait_time = 60 - (now - self._request_times[0])
            await asyncio.sleep(wait_time)
        
        # 并发限制
        await self._semaphore.acquire()
        self._request_times.append(now)
    
    def release(self):
        self._semaphore.release()

# 全局实例
llm_limiter = LLMConcurrencyLimiter(max_concurrent=10, max_per_minute=60)
```

### 2.3 调用优先级

当并发达到上限时，按优先级排队：

| 优先级 | 操作 | 说明 |
|--------|------|------|
| P0 | 用户正在等待的单篇分析 | 用户盯着屏幕等结果 |
| P1 | 用户触发的改写 | 用户主动操作 |
| P2 | 批量分析（采集后自动触发） | 后台执行，用户不急 |
| P3 | 改写自检 | 可异步，不阻塞用户 |

### 2.4 缓存策略（减少重复调用）

| 缓存场景 | 策略 | TTL |
|----------|------|-----|
| 同一文章重复分析 | 相同article_id+内容hash → 返回缓存结果 | 永久（文章不变则结果不变） |
| 相同平台改写 | 相同article_id+platform+改写参数hash → 返回缓存 | 24小时 |
| 热点采集评分 | hotness_score缓存 | 1小时 |

```python
# 分析缓存键
cache_key = f"analysis:{article.id}:{content_hash}"

# 改写缓存键
cache_key = f"rewrite:{article.id}:{platform}:{params_hash}"
```

### 2.5 Token 消耗监控

```python
class LLMUsageTracker:
    """LLM调用用量追踪"""
    
    async def record_usage(
        self,
        user_id: UUID,
        action: str,        # analysis / rewrite / rewrite_check
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
        is_cache_hit: bool = False
    ):
        """记录一次LLM调用"""
        # 写入 llm_usage_log 表
        # 用于成本分析和配额审计
```

```sql
CREATE TABLE llm_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    input_tokens INT NOT NULL,
    output_tokens INT NOT NULL,
    cost_usd DECIMAL(10,6) NOT NULL,
    is_cache_hit BOOLEAN DEFAULT FALSE,
    latency_ms INT,                    -- 响应时间
    created_at TIMESTAMP DEFAULT NOW()
);

-- 按用户+日期统计
CREATE INDEX idx_llm_usage_user_date ON llm_usage_log(user_id, created_at DATE);
```

---

## 三、内容安全管理

### 3.1 风险场景

| 场景 | 风险 | 严重性 |
|------|------|--------|
| 用户上传违规内容 | 传播违法信息 | 高 |
| LLM改写强化违规元素 | 平台封号+法律责任 | 高 |
| 用户利用改写洗稿 | 侵权纠纷 | 中 |
| 采集到违规内容 | 展示风险 | 中 |

### 3.2 三层内容安全机制

```
输入层（用户上传/采集内容）
  │
  ▼
[第一层] 关键词过滤 → 命中敏感词 → 拦截/标记
  │
  ▼
[第二层] LLM安全审查 → 识别隐含违规 → 标记+警告
  │
  ▼
输出层（改写结果）
  │
  ▼
[第三层] 输出审查 → 改写结果合规检查 → 过滤/重生成
```

### 3.3 第一层：关键词过滤

```python
class SensitiveWordFilter:
    """敏感词过滤器"""
    
    def __init__(self, word_list_path: str = "data/sensitive_words.txt"):
        with open(word_list_path) as f:
            self.words = set(line.strip() for line in f if line.strip())
    
    def check(self, text: str) -> tuple[bool, list[str]]:
        """检查文本是否包含敏感词，返回(是否安全, 命中的词列表)"""
        hits = [w for w in self.words if w in text]
        return len(hits) == 0, hits
    
    def redact(self, text: str) -> str:
        """替换敏感词为***"""
        for word in self.words:
            if word in text:
                text = text.replace(word, "***")
        return text
```

### 3.4 第二层：LLM安全审查

```python
CONTENT_SAFETY_PROMPT = """
请判断以下内容是否包含：
1. 违法违规信息（涉政/涉黄/涉暴/涉毒）
2. 虚假信息/谣言
3. 侵权内容（大面积抄袭）
4. 其他不适合传播的内容

只需返回JSON：
{
  "is_safe": true/false,
  "risk_level": "none" / "low" / "medium" / "high",
  "risk_categories": ["category1", ...],
  "reason": "简要说明"
}
"""
```

### 3.5 第三层：输出审查

| 检查项 | 规则 | 处理 |
|--------|------|------|
| 改写结果包含敏感词 | 与输入层同一敏感词库 | 替换为*** |
| 改写结果与原文相似度>95% | 基本没改，可能是洗稿 | 警告用户"改写幅度过小" |
| 改写结果引入原文没有的敏感元素 | LLM自行添加的 | 删除相关段落+重新生成 |

### 3.6 内容安全标记流转

```
上传/采集内容 → 安全审查
  │
  ├── safe → 正常流程（分析/改写/展示）
  │
  ├── low_risk → 标记⚠️，用户可查看但不自动分析
  │              用户确认后可继续操作
  │
  ├── medium_risk → 标记🚫，需用户二次确认
  │                  改写时强制开启输出审查
  │
  └── high_risk → 拦截，不存储不展示
                   返回错误："内容违规，无法处理"
```

### 3.7 内容安全数据模型

```sql
-- 在 article 表增加安全字段
ALTER TABLE article ADD COLUMN safety_level VARCHAR(20) DEFAULT 'safe';
-- safe / low_risk / medium_risk / high_risk

ALTER TABLE article ADD COLUMN safety_check_result JSONB;
-- {"is_safe": true, "risk_level": "none", "risk_categories": [], "reason": ""}

-- 在 rewrite_result 表增加安全字段
ALTER TABLE rewrite_result ADD COLUMN safety_passed BOOLEAN DEFAULT TRUE;
ALTER TABLE rewrite_result ADD COLUMN safety_check_result JSONB;
```

---

## 四、LLM服务容灾

### 4.1 多模型降级链

| 优先级 | 模型 | 用途 | 降级条件 |
|--------|------|------|----------|
| 1 | GPT-4o-mini | 分析+改写（默认） | API错误率>10% |
| 2 | DeepSeek-V3 | 分析+改写（备用） | GPT-4o-mini不可用 |
| 3 | 规则引擎 | 仅评分（改写不可替代） | 所有LLM不可用 |

### 4.2 降级切换逻辑

```python
async def call_llm(prompt: str, **kwargs) -> str:
    """LLM调用，支持自动降级"""
    models = ["gpt-4o-mini", "deepseek-v3"]  # 降级链
    
    for model in models:
        try:
            result = await llm_client.chat(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                **kwargs
            )
            return result
        except (RateLimitError, APIConnectionError) as e:
            logger.warning(f"模型 {model} 调用失败: {e}，尝试降级")
            continue
    
    # 所有模型都失败
    raise LLMServiceUnavailableError("所有LLM服务暂不可用，请稍后重试")
```

---

## 五、Redis 不可用降级方案

### 5.1 MVP方案：内存缓存

由于MVP阶段Redis可能不可用，使用Python进程内缓存替代：

```python
from collections import OrderedDict
import threading
import time

class MemoryCache:
    """进程内LRU缓存，替代Redis"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 3600):
        self._cache: OrderedDict = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            value, expires_at = self._cache[key]
            if time.time() > expires_at:
                del self._cache[key]
                return None
            self._cache.move_to_end(key)
            return value
    
    def set(self, key: str, value: Any, ttl: int = None):
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) >= self._max_size:
                self._cache.popitem(last=False)  # 淘汰最旧
            self._cache[key] = (value, time.time() + (ttl or self._default_ttl))

# 全局实例
cache = MemoryCache()
```

### 5.2 缓存降级链

| 场景 | 优先 | 降级 | 说明 |
|------|------|------|------|
| 分析结果缓存 | Redis（v2.0） | MemoryCache | MVP用内存缓存 |
| 限流计数 | Redis（v2.0） | MemoryCache | 多实例部署时需升级为Redis |
| 会话存储 | Redis（v2.0） | 数据库 | MVP单实例无问题 |

### 5.3 注意事项

- 内存缓存在服务重启后丢失，但分析结果已持久化到数据库，缓存只是加速
- 限流计数重启后归零，可接受（最多少算几次请求）
- 多实例部署时需升级为Redis，否则限流不准确
