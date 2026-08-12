"""任务队列测试"""
import asyncio
import pytest
from app.scheduler.task_queue import TaskQueue, TaskType, TaskPriority


class TestTaskQueue:
    @pytest.mark.asyncio
    async def test_submit_and_process(self):
        queue = TaskQueue(max_workers=1)
        results = []

        async def handler(payload):
            results.append(payload["value"])

        queue.register_handler(TaskType.ANALYZE, handler)
        await queue.start()

        await queue.submit(TaskType.ANALYZE, {"value": 42}, priority=TaskPriority.HIGH)

        # Wait for processing
        await asyncio.sleep(0.5)
        await queue.stop()

        assert len(results) == 1
        assert results[0] == 42

    @pytest.mark.asyncio
    async def test_priority_ordering(self):
        queue = TaskQueue(max_workers=1)
        order = []

        # Pause processing by not starting yet
        async def handler(payload):
            order.append(payload["tag"])

        queue.register_handler(TaskType.COLLECT, handler)

        # Submit in reverse priority order
        await queue.submit(TaskType.COLLECT, {"tag": "low"}, priority=TaskPriority.LOW)
        await queue.submit(TaskType.COLLECT, {"tag": "high"}, priority=TaskPriority.HIGH)
        await queue.submit(TaskType.COLLECT, {"tag": "normal"}, priority=TaskPriority.NORMAL)

        await queue.start()
        await asyncio.sleep(1.0)
        await queue.stop()

        # HIGH should be processed first
        assert order[0] == "high"

    @pytest.mark.asyncio
    async def test_no_handler(self):
        queue = TaskQueue(max_workers=1)
        await queue.start()

        # Submit without registering handler
        task_id = await queue.submit(TaskType.REWRITE, {"test": True})
        await asyncio.sleep(0.5)
        await queue.stop()

        assert queue.get_status(task_id) == "failed"

    @pytest.mark.asyncio
    async def test_handler_exception(self):
        queue = TaskQueue(max_workers=1)

        async def bad_handler(payload):
            raise RuntimeError("test error")

        queue.register_handler(TaskType.PARSE, bad_handler)
        await queue.start()

        task_id = await queue.submit(TaskType.PARSE, {})
        await asyncio.sleep(0.5)
        await queue.stop()

        assert queue.get_status(task_id) == "failed"
