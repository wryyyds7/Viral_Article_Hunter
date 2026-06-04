"""异步任务队列（进程内 asyncio.Queue）"""
import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Coroutine

logger = logging.getLogger(__name__)


class TaskType(str, Enum):
    COLLECT = "collect"
    ANALYZE = "analyze"
    REWRITE = "rewrite"
    PARSE = "parse"


class TaskPriority(int, Enum):
    HIGH = 1
    NORMAL = 2
    LOW = 3


@dataclass(order=True)
class TaskItem:
    """任务项"""
    priority: int
    task_id: str = field(compare=False)
    task_type: TaskType = field(compare=False)
    payload: dict = field(compare=False, default_factory=dict)
    created_at: datetime = field(compare=False, default_factory=datetime.now)


class TaskQueue:
    """基于 asyncio.PriorityQueue 的任务队列"""

    def __init__(self, max_workers: int = 5):
        self._queue: asyncio.PriorityQueue[TaskItem] = asyncio.PriorityQueue()
        self._workers: list[asyncio.Task] = []
        self._handlers: dict[TaskType, Callable] = {}
        self._max_workers = max_workers
        self._running = False
        self._task_status: dict[str, str] = {}  # task_id -> status

    def register_handler(self, task_type: TaskType, handler: Callable):
        """注册任务处理器"""
        self._handlers[task_type] = handler

    async def submit(
        self,
        task_type: TaskType,
        payload: dict,
        priority: TaskPriority = TaskPriority.NORMAL,
    ) -> str:
        """提交任务，返回 task_id"""
        task_id = str(uuid.uuid4())
        item = TaskItem(
            priority=priority.value,
            task_id=task_id,
            task_type=task_type,
            payload=payload,
        )
        await self._queue.put(item)
        self._task_status[task_id] = "queued"
        logger.info("任务已提交: %s (%s) - %s", task_id, task_type.value, priority.name)
        return task_id

    async def start(self):
        """启动 worker"""
        if self._running:
            return
        self._running = True
        for i in range(self._max_workers):
            worker = asyncio.create_task(self._worker(i))
            self._workers.append(worker)
        logger.info("任务队列已启动，%d 个 worker", self._max_workers)

    async def stop(self):
        """停止所有 worker"""
        self._running = False
        for worker in self._workers:
            worker.cancel()
        self._workers.clear()
        logger.info("任务队列已停止")

    async def _worker(self, worker_id: int):
        """工作协程"""
        while self._running:
            try:
                item = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            self._task_status[item.task_id] = "running"
            logger.info("Worker %d 开始处理: %s (%s)", worker_id, item.task_id, item.task_type.value)

            handler = self._handlers.get(item.task_type)
            if not handler:
                logger.error("无处理器: %s", item.task_type.value)
                self._task_status[item.task_id] = "failed"
                continue

            try:
                result = handler(item.payload)
                if asyncio.iscoroutine(result):
                    await result
                self._task_status[item.task_id] = "completed"
                logger.info("Worker %d 完成: %s", worker_id, item.task_id)
            except Exception as e:
                self._task_status[item.task_id] = "failed"
                logger.error("Worker %d 任务失败: %s - %s", worker_id, item.task_id, e)
            finally:
                self._queue.task_done()

    def get_status(self, task_id: str) -> str:
        """查询任务状态"""
        return self._task_status.get(task_id, "unknown")

    @property
    def pending_count(self) -> int:
        return self._queue.qsize()


# 全局任务队列
task_queue = TaskQueue(max_workers=5)
