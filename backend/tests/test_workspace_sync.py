import sys
from pathlib import Path

import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings
from app.database import Base, get_db
from app.main import app


class WorkspaceSyncTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSession = sessionmaker(bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.TestingSession()
            try:
                yield db
            finally:
                db.close()

        cls.override_get_db = override_get_db
        cls.previous_auth_disabled = settings.sync_auth_disabled
        settings.sync_auth_disabled = True
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        settings.sync_auth_disabled = cls.previous_auth_disabled
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)

    def test_workspace_sync_requires_auth_when_not_explicitly_disabled(self):
        settings.sync_auth_disabled = False
        response = self.client.get("/api/sync/workspace")
        self.assertEqual(response.status_code, 401)
        settings.sync_auth_disabled = True

    def test_workspace_sync_rejects_invalid_jwt(self):
        settings.sync_auth_disabled = False
        settings.supabase_jwt_secret = "test-secret"
        response = self.client.get(
            "/api/sync/workspace",
            headers={"Authorization": "Bearer definitely-not-a-jwt"},
        )
        self.assertEqual(response.status_code, 401)
        settings.supabase_jwt_secret = ""
        settings.sync_auth_disabled = True

    def test_workspace_sync_creates_version_one_and_rejects_stale_writes(self):
        state = {"dashboard": {"tasks": []}}

        first = self.client.put(
            "/api/sync/workspace",
            json={"workspace_id": "main", "state": state, "expected_version": None},
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["version"], 1)

        stale = self.client.put(
            "/api/sync/workspace",
            json={"workspace_id": "main", "state": {"dashboard": {"tasks": ["new"]}}, "expected_version": 0},
        )
        self.assertEqual(stale.status_code, 409)

        current = self.client.get("/api/sync/workspace")
        self.assertEqual(current.status_code, 200)
        self.assertEqual(current.json()["state"], state)
        self.assertEqual(current.json()["version"], 1)

    def test_workspaces_and_cases_are_isolated(self):
        created = self.client.post(
            "/api/workspaces",
            json={"name": "测试公众号", "description": "独立知识库"},
        )
        self.assertEqual(created.status_code, 201)
        workspace_id = created.json()["id"]

        new_case = self.client.post(
            "/api/cases",
            headers={"X-Workspace-Id": workspace_id},
            json={"platform": "wechat", "title": "测试公众号案例"},
        )
        self.assertEqual(new_case.status_code, 201)

        default_cases = self.client.get("/api/cases")
        self.assertEqual(default_cases.status_code, 200)
        self.assertNotIn("测试公众号案例", [item["title"] for item in default_cases.json()])

        isolated_cases = self.client.get(
            "/api/cases",
            headers={"X-Workspace-Id": workspace_id},
        )
        self.assertEqual(isolated_cases.status_code, 200)
        self.assertEqual([item["title"] for item in isolated_cases.json()], ["测试公众号案例"])
