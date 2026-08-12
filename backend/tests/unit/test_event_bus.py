"""EventBus 测试"""
import pytest
import asyncio
from app.event_bus import EventBus, Events


class TestEventBus:
    def setup_method(self):
        EventBus.clear()

    def test_register_and_emit(self):
        received = []

        async def handler(data):
            received.append(data)

        EventBus.on("test.event", handler)
        asyncio.run(EventBus.emit("test.event", {"key": "value"}))

        assert len(received) == 1
        assert received[0]["key"] == "value"

    def test_multiple_handlers(self):
        results = []

        async def handler1(data):
            results.append(f"h1:{data['msg']}")

        async def handler2(data):
            results.append(f"h2:{data['msg']}")

        EventBus.on("test.event", handler1)
        EventBus.on("test.event", handler2)
        asyncio.run(EventBus.emit("test.event", {"msg": "hello"}))

        assert len(results) == 2

    def test_no_handlers(self):
        # Should not raise
        asyncio.run(EventBus.emit("unregistered.event", {}))

    def test_handler_error_isolated(self):
        success = []

        async def bad_handler(data):
            raise ValueError("boom")

        async def good_handler(data):
            success.append(data["key"])

        EventBus.on("test.event", bad_handler)
        EventBus.on("test.event", good_handler)
        asyncio.run(EventBus.emit("test.event", {"key": "ok"}))

        # Good handler should still run despite bad handler error
        assert len(success) == 1
        assert success[0] == "ok"

    def test_off(self):
        received = []

        async def handler(data):
            received.append(data)

        EventBus.on("test.event", handler)
        EventBus.off("test.event", handler)
        asyncio.run(EventBus.emit("test.event", {}))

        assert len(received) == 0


class TestEventsConstants:
    def test_event_names_exist(self):
        assert Events.COLLECT_COMPLETED == "collect.completed"
        assert Events.ANALYZE_COMPLETED == "analyze.completed"
        assert Events.REWRITE_COMPLETED == "rewrite.completed"
        assert Events.UPLOAD_PARSED == "upload.parsed"
